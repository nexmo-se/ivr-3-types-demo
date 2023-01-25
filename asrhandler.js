const express = require('express');
const { employee_data } = require('./employee_data')

function getHost(req) {
    var url = req.protocol + '://' + req.get('host')
    if (process.env.NERU_APP_PORT) {
        url = process.env.ENDPOINT_URL_SCHEME + "/" + process.env.INSTANCE_SERVICE_NAME
    }
    return url
}

function generateContext(section) {
    var context = []
    for (data of employee_data[section]) {
        context.push(`${data["id"]}`)
        context.push(data["name"])
        context.push(data["surname"])
    }
    console.log(context)
    return context
}

function ASRHandler() {
    this.router = express.Router();
    this.start_ncco = (hostUrl) => {
        return [
            {
                "action": "talk",
                "text": "Welcome to Employee Search.",
                "language": "en-US",
                "style": 2,
                "bargeIn": false
            },
            {
                "action": "talk",
                "text": "Search employee in Accounting, Sales or Engineering? Say 'repeat' if you want to hear this menu again.",
                "language": "en-US",
                "style": 2,
                "bargeIn": true
            },
            {
                "action": "input",
                "eventMethod": "POST",
                "eventUrl": [hostUrl + "/asr_handler/initial_event"],
                "type": [
                    "speech"
                ],
                "speech": {
                    "context": ["accounting", "engineering", "sales", "repeat"],
                    "startTimeout": 4,
                    "endOnSilence": 0.5,
                }
            }
        ]
    }

    this.employee_found_ncco = (employee) => {
        return [
            {
                "action": "talk",
                "text": `Employee ${employee["id"]} is ${employee["name"]} ${employee["surname"]}. Good bye!`,
                "language": "en-US",
                "style": 2,
                "bargeIn": false
            }
        ]
    }

    this.no_reply_ncco = () => {
        return [
            {
                "action": "talk",
                "text": "I did not get any reply. Good bye.",
                "language": "en-US",
                "style": 2,
                "bargeIn": false
            }
        ]
    }

    this.invalid_ncco = () => {
        return [
            {
                "action": "talk",
                "text": "We do not have that company section. Good bye.",
                "language": "en-US",
                "style": 2,
                "bargeIn": false
            }
        ]
    }

    this.employee_not_found_ncco = () => {
        return [
            {
                "action": "talk",
                "text": "We do not have an employee with that ID. Good bye.",
                "language": "en-US",
                "style": 2,
                "bargeIn": false
            }
        ]
    }

    this.get_id_ncco = (hostUrl, section) => {
        console.log("get_id_ncco", hostUrl, section)

        return [{
            "action": "talk",
            "text": `You have chosen the ${section} section. What is the employee's name, surname or I.D.?`,
            "language": "en-US",
            "style": 2,
            "bargeIn": true
        },
        {
            "action": "input",
            "eventMethod": "POST",
            "eventUrl": [hostUrl + "/asr_handler/search_event?section=" + section],
            "type": [
                "speech"
            ],
            "speech": {
                "context": generateContext(section),
                "startTimeout": 4,
                "endOnSilence": 0.5,
            }
        }]
    }

    this.router.post("/initial_event", async (req, res, next) => {
        console.log("asrfevent", req.body)
        var sections = ["accounting", "sales", "engineering", "repeat"]
        var speech = req.body.speech.results
        console.log(speech)
        const result = speech.find(e => sections.includes(e.text))
        if (result == undefined) {
            return res.json(this.invalid_ncco())
        }
        if (result.text == "repeat") {
            return res.json(this.start_ncco(getHost(req)))
        }
        var ncco = this.get_id_ncco(getHost(req), result.text)
        console.log(ncco)
        return res.json(ncco)
    });

    this.router.post("/search_event", async (req, res, next) => {
        console.log("dtmfevent", req.body)
        var section = req.query.section
        var context = generateContext(section)
        var speech = req.body.speech.results
        console.log(speech)
        const result = speech.find(e => context.includes(e.text))
        if (result == undefined) {
            return res.json(this.employee_not_found_ncco())
        }
        var employee = employee_data[section].find(e => (e.id == result.text || e.name.toLowerCase() == result.text.toLowerCase() || e.surname.toLowerCase() == result.text.toLowerCase()))
        console.log(employee)
        if (employee == undefined) {
            return res.json(this.employee_not_found_ncco())
        } else {
            return res.json(this.employee_found_ncco(employee))
        }
    });
}
module.exports = {
    ASRHandler
} 