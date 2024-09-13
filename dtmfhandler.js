const express = require('express');
const { employee_data } = require('./employee_data')

function getHost(req) {
    var url = req.protocol + '://' + req.get('host')
    if (process.env.NERU_APP_PORT) {
        url = process.env.ENDPOINT_URL_SCHEME + "/" + process.env.INSTANCE_SERVICE_NAME
    }
    return url
}

function DTMFHandler() {
    this.text = "For Accounting, press 1. For Sales, press 2. for Engineering, Press 3. To Repeat this menu, press 0. Hangup to end."
    this.router = express.Router();
    this.menu_ncco = (text, hostUrl) => {
        console.log("*****")
        return [
            {
                "action": "talk",
                "text": text,
                "language": "en-US",
                "style": 2,
                "bargeIn": true
            },
            {
                "action": "input",
                "eventMethod": "POST",
                "eventUrl": [hostUrl + "/dtmf_handler/initial_event"],
                "type": [
                    "dtmf"
                ],
                "dtmf": {
                    "submitOnHash": true,
                    "timeOut": 4
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
                "text": "Invalid reply. Good bye.",
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

    this.get_id_ncco = (hostUrl, choice) => {
        console.log("get_id_ncco", hostUrl, choice)
        var section = ""
        if (choice == 1) { section = "accounting" }
        if (choice == 2) { section = "sales" }
        if (choice == 3) { section = "engineering" }

        return [{
            "action": "talk",
            "text": `You have chosen ${section}. Please enter the employee ID of the person you are Looking for followed by the pound sign.`,
            "language": "en-US",
            "style": 2,
            "bargeIn": true
        },
        {
            "action": "input",
            "eventMethod": "POST",
            "eventUrl": [hostUrl + "/dtmf_handler/search_event?section=" + section],
            "type": [
                "dtmf"
            ],
            "dtmf": {
                "submitOnHash": true,
                "timeOut": 4
            }
        }]
    }

    this.router.post("/initial_event", async (req, res, next) => {
        console.log("dtmfevent", req.body)
        event = req.body
       
        if (event.dtmf.digits == '') {
            return res.json(this.menu_ncco(this.text, getHost(req)))
        }
        if (parseInt(event.dtmf.digits) > 3 || isNaN(parseInt(event.dtmf.digits))) {
            return res.json(this.menu_ncco("We do not have that department. "+this.text, getHost(req)))
        }
        if (parseInt(event.dtmf.digits) == 0) {
            return res.json(this.menu_ncco(this.text, getHost(req)))
        }

        return res.json(this.get_id_ncco(getHost(req), parseInt(event.dtmf.digits)))
    });

    this.router.post("/search_event", async (req, res, next) => {
        console.log("dtmfevent", req.body)
        event = req.body
        section = req.query.section
        employee = employee_data[section].find(e => e.id == event.dtmf.digits)
        console.log(employee)
        if (employee == undefined) {
            return res.json(this.menu_ncco("That employee I.D. does not exist. "+this.text, getHost(req)))
        } else {
            return res.json(this.employee_found_ncco(employee))
        }
    });
}
module.exports = {
    DTMFHandler
} 