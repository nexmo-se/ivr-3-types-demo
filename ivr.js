require('dotenv').config();
const { Vonage } = require("@vonage/server-sdk");
const { CallWithNCCO } = require('@vonage/voice')
const { OutboundCallWithNCCO } = require('@vonage/voice')
const express = require('express');
const cors = require('cors');
const join = require('path').join;
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const app = express();
const port = process.env.NERU_APP_PORT || process.env.PORT;
const Vonage_API_KEY = process.env.API_ACCOUNT_ID || process.env.API_KEY;
const Vonage_PRIVATE_KEY = process.env.PRIVATE_KEY_PATH || process.env.VONAGE_PRIVATE_KEY;
const Vonage_APPLICATION_ID = process.env.API_APPLICATION_ID || process.env.APPLICATION_ID;
const Vonage_API_SECRET = process.env.API_SECRET;
const { DTMFHandler } = require('./dtmfhandler');
const { ASRHandler } = require('./asrhandler');
const { callbackify } = require('util');
const dtmfhandler = new DTMFHandler()
const asrhandler = new ASRHandler()

//app.use(logger('dev'));
app.set('view engine', 'ejs');
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use("/dtmf_handler", dtmfhandler.router)
app.use("/asr_handler", asrhandler.router)

const views_path = __dirname + '/views/';

//load the css, js, fonts to static paths so it's easier to call in template
app.use("/fonts", express.static(join(__dirname, "node_modules/bootstrap/fonts")));
app.use("/css", express.static(join(__dirname, "node_modules/bootstrap/dist/css")));
app.use("/js", express.static(join(__dirname, "node_modules/bootstrap/dist/js")));
app.use("/jqui", express.static(join(__dirname, "node_modules/jquery-ui/dist")));
app.use("/js", express.static(join(__dirname, "node_modules/jquery/dist")));

function getHost(req) {
  var url = req.protocol + '://' + req.get('host')
  if (process.env.NERU_APP_PORT) {
    url = process.env.ENDPOINT_URL_SCHEME + "/" + process.env.INSTANCE_SERVICE_NAME
  }
  return url
}


ai_ncco = (hostUrl) => {
  return [
    {
      "action": "talk",
      "text": "Connecting to Vonage AI"
    },
    {
      "action": "connect",
      "eventUrl": [hostUrl + "/ai_event"],
      "timeout": "45",
      "from": "12012524067",
      "endpoint": [
        {
          "type": "phone",
          "number": "6531388111",
        }
      ]
    }
  ]
}

console.log(Vonage_API_KEY, Vonage_API_SECRET, Vonage_APPLICATION_ID, Vonage_PRIVATE_KEY)
const vonage = new Vonage({
  apiKey: Vonage_API_KEY,
  applicationId: Vonage_APPLICATION_ID,
  apiSecret: Vonage_API_SECRET,
  privateKey: Vonage_PRIVATE_KEY

}, { debug: true });
console.log(">><<",vonage.voice.createOutboundCall)
vonage.accounts.getBalance(async (err, result) => {
    if (!err) {
        //Valid API Secret, Let's go
        console.log(">>",result)
    } else {
        console.log(err)
    }
  });


app.get('/_/health', async (req, res) => {
  res.sendStatus(200);
});

app.get('/', (req, res) => {
  res.render(views_path + "index.ejs", {})
});

app.get('/webhooks/inbound-call', (req, res) => {
  console.log(getHost(req) + "/webhooks/event")
  res.json(ai_ncco(getHost(req)));
});

app.post('/webhooks/event', (req, res) => {
  console.log("event", req.body)
});

app.post('/ai_event', (req, res) => {
  console.log("event", req.body)
});

app.post('/dtmf', async (req, res) => {
  //console.log("dtmf", req.body)
  if (!req.body.number) {
    res.status(400).send('Number Param missing');
    return
  }
  number = String(req.body.number).replace("+", "")
  const resp = await vonage.voice.createOutboundCall(
    new OutboundCallWithNCCO(
      dtmfhandler.menu_ncco(dtmfhandler.text, getHost(req)),
      { type: 'phone', number: number },
      { type: 'phone', number: "12013711764" }
    )
  ).then((r) => {
    return res.status(200).json({ "result": "success" })
  })
    .catch((err) => {
      console.log("ERR",err)
      return res.status(400).json({ "result": "fail", "message": err })
    });
  console.log(resp);
});

app.post('/asr', async (req, res) => {
  console.log("asr", req.body)
  if (!req.body.number) {
    res.status(400).send('Number Param missing');
    return
  }
  number = String(req.body.number).replace("+", "")
  const resp = await vonage.voice.createOutboundCall(
    new OutboundCallWithNCCO(
      asrhandler.menu_ncco("Welcome to employee search. "+asrhandler.text,getHost(req)),
      { type: 'phone', number: number },
      { type: 'phone', number: "12013711764" }
    )
  ).then((r) => {
    return res.status(200).json({ "result": "success" })
  })
    .catch((err) => {
      return res.status(400).json({ "result": "fail", "message": err })
    });
  console.log(resp);
});

app.post('/ivr', (req, res) => {
  console.log("asr", req.body)
  res.status(200).json([])
  //65 3138 8111
});

app.post('/ai', async (req, res) => {
  console.log("ai", req.body)
  if (!req.body.number) {
    res.status(400).send('Number Param missing');
    return
  }
  number = String(req.body.number).replace("+", "")
  const resp = await vonage.voice.createOutboundCall(
    new OutboundCallWithNCCO(
      ai_ncco(getHost(req)),
      { type: 'phone', number: number },
      { type: 'phone', number: "12013711764" }
    )
  ).then((r) => {
    return res.status(200).json({ "result": "success" })
  })
    .catch((err) => {
      return res.status(400).json({ "result": "fail", "message": err })
    });
  console.log(resp);
});

//console.log(process.env)

app.listen(port, () => {
  console.log(`Answering Machine Demo app listening on port ${port}`)
  console.log(``)
})
