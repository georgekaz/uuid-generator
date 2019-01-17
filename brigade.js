const { events, Job } = require("brigadier");

events.on("push", function(e, project) {
  console.log("received push for commit " + e.revision.commit)

  // Create a new job
  var node = new Job("test-runner")

  // We want our job to run the stock Docker Python 3 image
  node.image = "python:3"

  // Now we want it to run these commands in order:
  node.tasks = [
    "cd /src",
    "pip install -r requirements.txt",
    "python setup.py test"
  ]

  // Display logs from the job Pod
  node.streamLogs = true;

  // We're done configuring, so we run the job
  node.run()
})
