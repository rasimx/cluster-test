import React, {ReactNode, useState, useEffect} from 'react';

const socket = new WebSocket("ws://localhost:4000")
socket.onopen = () => {
  console.log('ONLINE')
}

socket.onclose = () => {
  console.log('DISCONNECTED')
}

const Table: React.FC = () => {

  const [workers, setWorkers] = useState<any[]>([])
  const [total, setTotal] = useState<{processed:number, received: number}>({processed:0, received:0})

  function killWorker(pid: number) {
    socket.send(JSON.stringify({action: "kill", pid: pid}));
  }

  useEffect(() => {
    socket.onmessage = response => {
      let data = JSON.parse(response.data)
      setWorkers(data.workers)
      setTotal(data.total)
    }
  },);

  return (
    <React.Fragment>
      <div style={{margin: "0 10px"}}>
        <table>
          <thead>
          <tr>
            <th>PID</th>
            <th>Type</th>
            <th>Cгенерированныe данные</th>
            <th>Обработанные данные</th>
            <th>Отключить</th>
          </tr>
          </thead>
          <tfoot>
            <tr className="cyan lighten-1">
              <td>Total</td>
              <td></td>
              <td>{total.received}</td>
              <td>{total.processed}</td>
              <td></td>
            </tr>
          </tfoot>
          <tbody>
          {workers.map(function (worker) {
            return (
              <tr key={worker.pid} className={worker.type == 'master' ? "blue lighten-3": ""}>
                <td>{worker.pid}</td>
                <td>{worker.type}</td>
                <td>{worker.type == 'master'? '' : worker.receivedCount}</td>
                <td>{worker.type == 'master'? '' : worker.processedCount}</td>
                <td>
                  <a className="waves-effect waves-light btn" onClick={killWorker.bind(null, worker.pid)}>OFF</a>
                </td>
              </tr>
            )
          })}
          </tbody>
        </table>
      </div>
    </React.Fragment>
  )
};

export default Table