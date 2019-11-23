const { app, BrowserWindow } = require('electron');

if (require('electron-squirrel-startup')) return app.quit();

const serverIP = 'http://127.0.0.1:3000';
var request = require('request');

const smartcard = require('smartcard');
const Devices = smartcard.Devices;
const devices = new Devices();
const CommandApdu = smartcard.CommandApdu;
const pcsc1 = require('pcsclite');
const pcsc = pcsc1();
const legacy = require('legacy-encoding');
let cmdIndex = 0;
let inGetImage = false;

var cid = '';
var nameTH = '';
var nameEN = '';
var address = '';

let imgTemp = '';
const fs = require('fs');

const ipc = require('electron').ipcMain;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
  app.quit();
}

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 600,
    height: 600,
    webPreferences: {
      nodeIntegration: true
    }
  });

  // and load the index.html of the app.
  mainWindow.loadURL(`file://${__dirname}/index.html`);

  // Open the DevTools.
  // mainWindow.webContents.openDevTools();

  // Emitted when the window is closed.
  mainWindow.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.

devices.on('device-activated', event => {
    const currentDevices = event.devices;
    let device = event.device;
    console.log(`Device '${device}' activated, devices: ${currentDevices}`);

    for (let prop in currentDevices) {
        console.log("Devices: " + currentDevices[prop]);
    }

    device.on('card-inserted', event => {
        let card = event.card;
        console.log(`Card '${card.getAtr()}' inserted into '${event.device}'`);
        mainWindow.webContents.send('status',`Card '${card.getAtr()}' inserted into '${event.device}'`);

        card.on('command-issued', event => {
            console.log(`Command '${event.command}' issued to '${event.card}' `);
            mainWindow.webContents.send(`Command '${event.command}' issued to '${event.card}' `);
        });

        card.on('response-received', event => {
            if (inGetImage) {
                //    console.log('read image ' +imgTemp);

               // readImageOneLine(card);
            } else {

                //console.log('no read image ' +imgTemp);
            }
            // console.log(`Response '${event.response}' received from '${event.card}' in response to '${event.command}'`);
        });


        card
            .issueCommand(new CommandApdu(new CommandApdu({ bytes: [0x00, 0xA4, 0x04, 0x00, 0x08, 0xA0, 0x00, 0x00, 0x00, 0x54, 0x48, 0x00, 0x01] })))
            .then((response) => {
                console.log(response);

           //     readImageOneLine(card);
           readData(card) ;

            }).catch((error) => {
                console.error(error);
            });


    });
    device.on('card-removed', event => {
        console.log(`Card removed from '${event.name}' `);
        mainWindow.webContents.send('status',`เครื่องอ่านบัตร พร้อมใช้งาน กรุณาเสียบบัตร`);
    });

});

devices.on('device-deactivated', event => {
    mainWindow.webContents.send('status',`Device '${event.device}' deactivated, devices: [${event.devices}]`);

});

let mImgTemp='';
// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
function readData(card) {

    card
        .issueCommand((new CommandApdu({ bytes: [0x80, 0xb0, 0x00, 0x04, 0x02, 0x00, 0x0d] })))
        .then((response) => {
            mainWindow.webContents.send('status',`readCid '${response.toString('hex')}`);

            card
                .issueCommand((new CommandApdu({ bytes: [0x00, 0xc0, 0x00, 0x00, 0x0d] })))
                .then((response) => {
                  //MTQwOTkwMDM5NjIwNZAA  
               //     response ="1409900396205";
           //
               //response =response.slice(0,-2);
             //   let mImgTemp = response.toString();

                    //console.log(`Response readCid ${mImgTemp}`);
                    // readImageOneLine(card);
                    var buffer = legacy.decode(response, "tis620");
                    console.log('หมายเลขบัตรประชาชน',buffer);
                    cid = buffer.replace(/ /gi,'').replace('�','').replace("\u0000", "");
                   readAddress(card);
                }).catch((error) => {
                    console.error(error);
                });


        }).catch((error) => {
            console.error(error);
        });

}

function readAddress(card) {

    card
        .issueCommand((new CommandApdu({ bytes: [0x80, 0xb0, 0x15, 0x79, 0x02, 0x00, 0x64] })))
        .then((response) => {

            card
                .issueCommand((new CommandApdu({ bytes: [0x00, 0xc0, 0x00, 0x00, 0x64] })))
                .then((response) => {
                    var buffer = legacy.decode(response, "tis620");
                    buffer = buffer.replace(/ /gi,'').replace(/#/gi,' ')
                    console.log(`Response readAddress '${buffer}`)
                    address = buffer.replace('�','').replace("\u0000", "");
                    readNameEN(card);
                }).catch((error) => {
                    console.error(error);
                });


        }).catch((error) => {
            console.error(error);
        });

}

function readNameEN(card) {

    card
        .issueCommand((new CommandApdu({ bytes: [0x80, 0xb0, 0x00, 0x75, 0x02, 0x00, 0x64] })))
        .then((response) => {

            card
                .issueCommand((new CommandApdu({ bytes: [0x00, 0xc0, 0x00, 0x00, 0x64] })))
                .then((response) => {
                    var buffer = legacy.decode(response, "tis620");
                    buffer = buffer.replace(/ /gi,'').replace(/#/gi,' ');
                    console.log(`Response read English Name '${buffer}`)
                    nameEN = buffer.replace('�','').replace("\u0000", "");
                    // readImageOneLine(card);
                    readNameTH(card);
                }).catch((error) => {
                    console.error(error);
                });


        }).catch((error) => {
            console.error(error);
        });

}

function readNameTH(card) {

    card
        .issueCommand((new CommandApdu({ bytes: [0x80, 0xb0, 0x00, 0x11, 0x02, 0x00, 0x64] })))
        .then((response) => {

            card
                .issueCommand((new CommandApdu({ bytes: [0x00, 0xc0, 0x00, 0x00, 0x64] })))
                .then((response) => {
                    var buffer = legacy.decode(response, "tis620");
                    buffer = buffer.replace(/ /gi,'').replace(/#/gi,' ');
                    console.log(`Response read THAI Name '${buffer}`)
                    nameTH = buffer.replace('�','').replace("\u0000", "");
                    addGuest();
                }).catch((error) => {
                    console.error(error);
                });


        }).catch((error) => {
            console.error(error);
        });

}

function addGuest () {
  if(nameTH, nameEN, address, cid){
    console.log('contacting server');
    mainWindow.webContents.send('status',`กำลังติดต่อเซอร์เวอร์...`);
    request(
      { method: 'POST'
        , uri: serverIP + '/addguest'
        , headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ 
              name: nameEN,
              idPassport: cid,
              email: nameTH,
              tel: '1',
              address: address,
              nationality: 'THA'
              })
        }
      , function (error, response, body) {
        console.log('error:', error); // Print the error if one occurred
        console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
        console.log('body:', body); // Print the HTML for the Google homepage.
        if(response){
           mainWindow.webContents.send('status',`กำลังอ่านข้อมูลบัตร...<br>หมายเลขบัตรประชาชน: ${cid}<br>ชื่อภาษาไทย: ${nameTH}<br>ชื่อภาษาอังกฤษ: ${nameEN}<br>ที่อยู่: ${address}<br>สถานะ: ${body}`);
        } 
        if(error){
           mainWindow.webContents.send('status',`อ่านข้อมูลไม่สำเร็จ: ${body,error}`);
        }
      });
  }
}
