const dotenv = require('dotenv')
const cron = require('node-cron')
const express = require('express')
const nodemailer = require('nodemailer')
const util = require('util')
const exec = util.promisify(require('child_process').exec)

// Setup important stuff
const app = express()
dotenv.config()

const md_recipients = 'mike.endale@gmail.com'
const va_recipients = 'mike.endale@gmail.com'

// Create mail transporter.
// Highly recommend to avoid using your personal email
// account for this step. Quick solutions on the internet
// may guide you towards lowering security measures.
// Consider using a new separate developer account to
// avoid any risk to your personal email account.
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: true,
  auth: {
    user: process.env.SMTP_AUTH_USERNAME,
    pass: process.env.SMTP_AUTH_PASSWORD,
  },
})

const hunt = async (state) => {
  if (!state) {
    console.error('State is required')
    return
  }

  try {
    const { stdout, stderr } =
      state === 'MD'
        ? await exec('sh scripts/md-hunt.sh')
        : await exec('sh scripts/va-hunt.sh')

    if (stdout) {
      const data =
        state === 'MD'
          ? JSON.parse(stdout).responsePayloadData.data['MD']
          : JSON.parse(stdout).responsePayloadData.data['VA']

      return data
        .map((p) => `City: ${p.city}, Total Available: ${p.totalAvailable} \n`)
        .toString()
    }
  } catch (err) {
    console.error(err)
  }
}

cron.schedule('*/15  * * * *', function () {
  console.log('---------------------')
  console.log('Running Hunter')

  // Check Maryland and email
  hunt('MD').then((res) => {
    let messageOptions = {
      from: process.env.FROM,
      to: process.env.MD_RECIPIENTS,
      subject: 'Maryland CVS Vaccine Availability',
      text: res,
    }

    transporter.sendMail(messageOptions, function (error, info) {
      if (error) {
        throw error
      } else {
        console.log('Maryland email successfully sent!')
      }
    })
  })

  // Check Virginia and email
  hunt('VA').then((res) => {
    let messageOptions = {
      from: process.env.FROM,
      to: process.env.VA_RECIPIENTS,
      subject: 'Virginia CVS Vaccine Availability',
      text: res,
    }

    transporter.sendMail(messageOptions, function (error, info) {
      if (error) {
        throw error
      } else {
        console.log('Virginia email successfully sent!')
      }
    })
  })
})

app.listen(process.env.PORT)
console.log(`Vaccine hunter has started on port ${process.env.PORT}`)
