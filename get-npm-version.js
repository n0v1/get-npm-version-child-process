"use strict"

const childProcess = require('child_process')
const wtfnode = require('wtfnode')

const command = 'npm --version'
const options = {
  timeout: 5000,
  // env: {
  //   NO_UPDATE_NOTIFIER: true
  // }
}
let intervalId

console.log(new Date(Date.now()).toLocaleString(), '- START')
console.time('childProcess.exec')

const child = childProcess.exec(command, options, (err) => {
  console.timeEnd('childProcess.exec')
  if (err) {
    console.error(`Error: ${err}`)
    return
  }
})

child.stdout.on('data', (data) => {
  console.log(new Date(Date.now()).toLocaleString(), '- DATA -', 'npm version:', data.split('\n')[0])
})

child.on('error', (err) => {
  console.log(new Date(Date.now()).toLocaleString(), '- ERROR -', err)
})

child.on('exit', (code) => {
  console.log(new Date(Date.now()).toLocaleString(), '- EXIT -', code)
  // const activeHandles = process._getActiveHandles()
  // const activeRequests = process._getActiveRequests()
  // console.log('active handles:', activeHandles.length, 'active requests:', activeRequests.length)

  // intervalId = setInterval(() => {
  //   wtfnode.dump()
  // }, 1000)
})

child.on('close', (code) => {
  clearInterval(intervalId)
  console.log(new Date(Date.now()).toLocaleString(), '- CLOSE -', code)
})
