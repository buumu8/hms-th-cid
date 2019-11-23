const ipc = require('electron').ipcRenderer;

let statusDiv = document.querySelector('#status');
let readyDiv = document.querySelector('#ready');

ipc.on('status', (event,messages) => {
	statusDiv.innerHTML = messages;
})

ipc.on('ready', (event,messages) => {
	readyDiv.innerHTML = messages;
})
