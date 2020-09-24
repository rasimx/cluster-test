import Message from "./index";

class ChildItem {
  constructor() {
    process.on("message", (m: Message) => {
      if (m.action === "set-master") {
        this.setMaster();
      } else {
        this.log(m.data);
      }
    });
  }

  setMaster(): void {
    setInterval(() => {
      const randomNumber = this.getRandom();
      const msg: Message = {
        action: "new-random",
        data: randomNumber,
      };
      process.send(msg);
    }, 1);
  }

  getRandom(): number {
    return Math.random() * (1000 - 100000) + 1000;
  }

  log(data: number) {
    console.log("PID:" + process.pid, data);
    const msg: Message = {
      action: "success",
      data: process.pid,
    };
    process.send(msg);
  }
}

const child = new ChildItem();

export default child;
