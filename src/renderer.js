const ipc = require('electron').ipcRenderer;

let statusDiv = document.querySelector('#status');

ipc.on('status', (event,messages) => {
	statusDiv.innerHTML = messages;
})
