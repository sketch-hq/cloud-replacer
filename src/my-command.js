const sketch = require('sketch')
const fs = require('@skpm/fs')
const child_process = require('@skpm/child_process')
const outputPath = tmpPath()

export default function() {
  let cloudDoc = sketch.getSelectedDocument()
  let isCloudDocument = cloudDoc.path.includes('.sketchcloud')
  if (isCloudDocument) {
    sketch.UI.alert("Cloud Replacer", "We're going to replace your Cloud document with a local file. Choose a local file in the next step, or click 'Cancel' if you don't want to replace anything.\n\nBe aware this is a potentially destructive operation. Make backups, and don't replace a document that's currently being edited.")
    sketch.Document.open(undefined, (err, localDoc) => {
      if (err) {
        sketch.UI.alert("Oh no, we failed to open the document")
      } else {
        if (localDoc != undefined) {

          cloudDoc.close()

          let cloudFile = cloudDoc._object.fileURL()
          let localFile = localDoc._object.fileURL()
          let cloudFilePath = cloudFile.path()
          let localFilePath = localFile.path()
          let cloudOutput = outputPath + '/cloud'
          let localOutput = outputPath + '/local'
          // Backup files
          child_process.execSync(`cp "${cloudFilePath}" "${outputPath}/"`)
          child_process.execSync(`cp "${localFilePath}" "${outputPath}/"`)

          // Unzip files
          child_process.execSync(`/usr/bin/unzip "${cloudFilePath}" -d "${cloudOutput}"`)
          child_process.execSync(`/usr/bin/unzip "${localFilePath}" -d "${localOutput}"`)

          // Grab user data from Cloud file
          child_process.execSync(`cp "${cloudOutput}/user.json" "${localOutput}/user.json"`)

          const cloudDocJSON = JSON.parse(fs.readFileSync(cloudOutput + '/document.json', 'utf8'))
          const localDocJSON = JSON.parse(fs.readFileSync(localOutput + '/document.json', 'utf8'))
          localDocJSON.documentState = cloudDocJSON.documentState

          const data = NSString.stringWithString(JSON.stringify(localDocJSON))
          data.writeToURL_atomically_encoding_error(localOutput + '/document.json', false, NSUnicodeStringEncoding, null)

          // Zip file, and replace original
          child_process.execSync(`cd "${localOutput}" && zip -r test.sketch . && cp test.sketch "${cloudFilePath}"`)
          localDoc.close()
          sketch.UI.alert('Cloud Replacer', 'Document replaced!')
          sketch.Document.open(cloudFile)
          // TODO: Automatically save document to force a Cloud upload
        }
      }
    })
  }
}

function tmpPath() {
  const uuid = NSUUID.UUID().UUIDString()
  const path = NSTemporaryDirectory()
    .stringByAppendingPathComponent('cloud-replacer/')
    .stringByAppendingPathComponent(uuid)

  fs.mkdirSync(path, { recursive: true })
  return path
}
