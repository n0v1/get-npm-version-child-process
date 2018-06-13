# Test `npm --version` in child process

## Reason

Using the [NativeScript CLI](https://docs.nativescript.org/docs-cli/start) to build an Android app took around 6 minutes on a Windows system compared to around 1 minute on our old Mac.

Debugging showed that the process hangs for 3 minutes when trying to get the currently installed npm version in [this script](https://github.com/NativeScript/nativescript-doctor/blob/81fe42a2cd63812b138bcd579ecbb384d83bcf0d/lib/sys-info.ts#L97).

To get the npm version, NativeScript executes the command `npm -v` in a [child process](https://nodejs.org/api/child_process.html#child_process_child_process_exec_command_options_callback) and waits for the output.

It seemed strange that this alone took 3 minutes to complete. I wrote this [script](get-npm-version.js) to test in isolation. The callback function is called just before the close event occurs. Without a timeout this happens after 3 minutes. When setting a timeout, the close event is fired after the timeout period.

### Example output

Expected output:

```shell
2018-6-13 13:15:32 - START
2018-6-13 13:15:33 - DATA - npm version: 5.6.0
2018-6-13 13:15:33 - EXIT - 0
childProcess.exec: 934.978ms
2018-6-13 13:15:37 - CLOSE - 0
```

Actual output without an expicit timeout:

```shell
2018-6-13 13:15:32 - START
2018-6-13 13:15:33 - DATA - npm version: 5.6.0
2018-6-13 13:15:33 - EXIT - 0
childProcess.exec: 189416.095ms
2018-6-13 13:18:31 - CLOSE - 0
```

Actual output with an timeout of 10 seconds:

```shell
2018-6-13 10:32:34 - START
2018-6-13 10:32:35 - DATA - npm version: 5.6.0
2018-6-13 10:32:35 - EXIT - 0
childProcess.exec: 10019.768ms
2018-6-13 10:32:43 - CLOSE - 0
```

It seemed that something was preventing the child process from [closing](https://github.com/nodejs/node/blob/v10.4.0/doc/api/child_process.md#event-close). I added the [wtfnode module](https://www.npmjs.com/package/wtfnode) to see open handles. Testing different node/npm combinations revealed that this "error" started to occur with npm version 4.4.0 (the node version did not make a difference).

## Test Matrix

| npm     | Node 4.9.1 | Node 6.11.2 | Node 7.10.1 | Node 8.11.3 | Node 9.11.2 | Node 4.9.1 |
| --------| ---------- | ----------- | ----------- | ----------- | ----------- | ---------- |
| 2.15.12 | ok         | ok          | ok          | ok          | ok          | ok         |
| 3.10.10 | ok         | ok          | ok          | ok          | ok          | ok         |
| 4.2.0   | ok         | ok          | ok          | ok          | ok          | ok         |
| 4.3.0   | ok         | ok          | ok          | ok          | ok          | ok         |
| 4.4.0   | -          | -           | -           | -           | -           | -          |
| 4.6.1   | -          | -           | -           | -           | -           | -          |
| 5.6.0   | -          | -           | -           | -           | -           | -          |
| 5.10.0  | -          | -           | -           | -           | -           | -          |
| 6.1.0   | -          | -           | -           | -           | -           | -          |

## Cause

npm 4.4.0 introduced an [update notification feature](https://github.com/npm/npm/releases/tag/v4.4.0). When behind a corporate proxy (like we are) the update check can't be completed and times out after 3 minutes. Only then the child process is closed and the script execution goes on.

The update check feature uses the [update-notifier](https://github.com/yeoman/update-notifier) package that uses the [latest-version](https://github.com/sindresorhus/latest-version) package which in turn uses [package-json](https://github.com/sindresorhus/package-json). package-json currently does not support proxies and the author [seems not to be willing to implement proxy support](https://github.com/sindresorhus/package-json/issues/22#issuecomment-185158091).

## Workaround

See https://github.com/yeoman/update-notifier#user-settings

- Set environment variable NO_UPDATE_NOTIFIER=1
- Use `--no-update-notifier` flag
- Set `"optOut": true` in `~/.config/configstore/update-notifier-[your-module-name].json`

## Possible Solutions

- Skip update check if a proxy is used (check if proxy variables are set in npm config?)
- Implement a (short) timeout for the proxy check and kill the child process after that (would have to be implemented in [update-notifier](https://github.com/yeoman/update-notifier) package
- Use another module for the update check that has proxy support
- Use another method to get the latest npm version from the registry that relies on the npm proxy configuration (`npm outdated`, `npm view`)
