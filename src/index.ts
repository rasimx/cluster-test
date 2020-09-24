import dotenv from "dotenv";
import { fork, ChildProcess } from "child_process";
import path from "path";
import WebSocket from "ws";
import { worker } from "cluster";
import { throttle } from "lodash";

dotenv.config();

const nodeCount: number = +process.env.WORKERS_COUNT;
const port: number = +process.env.SERVER_PORT;

interface Worker {
  pid: number;
  type: "master" | "worker";
  receivedCount: number;
  processedCount: number;
  instance: ChildProcess;
}

export default interface Message {
  action: string;
  data?: any;
}

class Server {
  allWorkers: Worker[] = [];
  ws: WebSocket | null = null;
  master: Worker | null = null;
  socketThrottledSendFunc: any;
  totalReceived = 0;
  totalProcessed = 0;

  constructor() {
    for (let i = 0; i < nodeCount; i++) {
      this.makeWorker();
    }
    this.makeMaster();
    this.socketInit();
    this.socketThrottledSendFunc = throttle(this.socketSend, 100);
  }

  makeWorker() {
    const child = fork(__dirname + path.sep + "Child.js");
    child.on("message", (msg: Message) => {
      if (msg.action == "success") {
        this.allWorkers.filter((worker) => worker.pid === msg.data)[0]
          .processedCount++;
        this.totalProcessed++;
      }
      this.socketThrottledSendFunc();
    });

    child.on("close", (code) => {
      console.log(`child process exited with code ${code}`);
      this.makeWorker();
    });

    this.allWorkers.push({
      pid: child.pid,
      type: "worker",
      receivedCount: 0,
      processedCount: 0,
      instance: child,
    });
  }

  makeMaster() {
    this.master = this.allWorkers[0];
    this.master.type = "master";

    let index = 0;
    this.master.instance.on("message", (data: Message) => {
      const workers = this.allWorkers.filter(
        (worker) => worker.type === "worker"
      );
      if (index >= workers.length) index = 0;
      const currentWorker = workers[index];
      const message: Message = {
        action: "new-random",
        data: data,
      };
      currentWorker.instance.send(message);
      currentWorker.receivedCount++;
      this.totalReceived++;
      index++;
    });
    const messageForMaster: Message = {
      action: "set-master",
    };
    this.master.instance.send(messageForMaster);
  }

  killWorker(pid: number) {
    const index = this.allWorkers.findIndex((worker) => worker.pid == pid);
    const currentWorker = this.allWorkers.splice(index, 1)[0];
    currentWorker.instance.kill();
    if (currentWorker.type == "master") {
      this.makeMaster();
    }
  }

  socketInit() {
    const server = new WebSocket.Server({ port });

    server.on("connection", (ws) => {
      this.ws = ws;

      ws.on("message", (message) => {
        const data = JSON.parse(message.toString());
        if (data.action == "kill") {
          this.killWorker(data.pid);
        }
      });
    });
  }

  socketSend() {
    if (!this.ws) return;
    const workers = this.allWorkers.map(
      ({ pid, type, receivedCount, processedCount }) => ({
        pid,
        type,
        receivedCount,
        processedCount,
      })
    );
    const total = {
      processed: this.totalProcessed,
      received: this.totalReceived,
    };
    this.ws.send(
      JSON.stringify({
        workers,
        total,
      })
    );
  }
}

new Server();
