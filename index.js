require('dotenv').config();
var cron = require('node-cron');
let PImage = require('pureimage');
let { PNG } = require('pngjs');
const needle = require('needle');
let fs = require('fs');

PImage.encodePNGSync = function (bitmap) {
  let png = new PNG({
    width: bitmap.width,
    height: bitmap.height,
  });

  for (let i = 0; i < bitmap.width; i++) {
    for (let j = 0; j < bitmap.height; j++) {
      for (let k = 0; k < 4; k++) {
        let n = (j * bitmap.width + i) * 4 + k;
        png.data[n] = bitmap.data[n];
      }
    }
  }

  return PNG.sync.write(png);
};

cron.schedule('* * * * *', () => {
  // Push an updated image to your tidbyt device
  console.log('running a task every minute');
});

async function generateImage() {
  PImage.registerFont('./fonts/OpenSans-Regular.ttf', 'Open Sans').loadSync();
  const image = PImage.make(64, 32);
  const ctx = image.getContext('2d');

  console.log('font loaded');
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, 64, 32);
  ctx.fillStyle = '#ffffff';
  ctx.font = "24px 'Open Sans'";
  ctx.fillText('ABC', 1, 16);

  return image;
}

function sendToTidbyt(image) {
  let base64String = image.toString('base64');
  needle(
    'post',
    `https://api.tidbyt.com/v0/devices/${process.env.TIDBYT_DEVICE_ID}/push`,
    {
      image: base64String,
      installationID: process.env.TIDBYT_INSTALLATION_ID,
      // Most of the time we want our app to stay in regular rotation and update only in the background.
      background: true,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.TIDBYT_API_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  )
    .then((res) => {
      //   console.log(res);
    })
    .catch((err) => {
      console.log(err);
    });
}

async function runTidbytApp() {
  let image = await generateImage();

  // Write your image to a file for debugging purposes
  //   PImage.encodePNGToStream(image, fs.createWriteStream('out.png'))
  //     .then(() => {
  //       console.log('wrote out the png file to out.png');
  //     })
  //     .catch((e) => {
  //       console.log('there was an error writing');
  //     });

  let pngImage = await PImage.encodePNGSync(image);

  sendToTidbyt(pngImage);
}

// This could be moved into the cron job if you want to run it every minute
runTidbytApp();
