const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');
const os = require('os');

const conn = new Client();

conn.on('ready', () => {
  console.log('Client :: ready');
  
  const commands = ['sudo docker logs --tail=100 booking-test'];
  
  const executeNext = (index) => {
    if (index >= commands.length) {
      console.log('All commands executed successfully.');
      conn.end();
      return;
    }
    
    console.log(`Executing: ${commands[index]}`);
    conn.exec(commands[index], { pty: true }, (err, stream) => {
      if (err) throw err;
      
      let stderrOutput = '';
      
      stream.on('close', (code, signal) => {
        console.log(`Command completed with code: ${code}`);
        if (code !== 0 && stderrOutput.trim() !== '') {
            console.error(`Command failed. Output: ${stderrOutput}`);
        }
        executeNext(index + 1);
      }).on('data', (data) => {
        const text = data.toString();
        if (text.includes('password') || text.includes('Password')) {
          stream.write('Anava@9002\n');
        } else {
            console.log('STDOUT: ' + text);
        }
      }).stderr.on('data', (data) => {
        const text = data.toString();
        stderrOutput += text;
        console.error('STDERR: ' + text);
        if (text.includes('password') || text.includes('Password')) {
          stream.write('Anava@9002\n');
        }
      });
    });
  };
  
  executeNext(0);
}).connect({
  host: '172.30.10.21',
  port: 2213,
  username: 'itadmin',
  privateKey: fs.readFileSync(path.join(os.homedir(), '.ssh', 'id_ed25519')),
  passphrase: 'lard jockey uncrushed prone',
  readyTimeout: 30000
});

