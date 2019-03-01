const { events, Job } = require("brigadier");
//just a comment to push
// Github events
events.on("check_suite:requested", runTests);
events.on("check_suite:rerequested", runTests);
events.on("check_run:rerequested", runTests);

// Internal events
events.on("tests-passed", buildDockerImage);
events.on("tests-failed", notifySlackFailure);
events.on("build-success", deployHelmChart);
events.on("build-failure", notifySlackFailure);
events.on("deploy-success", notifySlackSuccess);
events.on("deploy-failure", notifySlackSuccess);

// events.on("check_suite:requested", function(e, project){
// 	console.log("check_suite:requested");
// 	console.log(e);
// })

// events.on("check_suite:rerequested", function(e, project){
// 	console.log("check_suite:rerequested");
// 	console.log(e);
// })

// events.on("check_run:rerequested", function(e, project){
// 	console.log("check_run:rerequested");
// 	console.log(e);
// })

// events.on("push", function(e, project){
// 	console.log("push");
// 	console.log(e);
// })

// events.on("check_suite", function(e, project){
// 	console.log("check_suite");
// 	console.log(e);
// })

// events.on("check_run", function(e, project){
// 	console.log("check_run");
// 	console.log(e);
// })

// Our main test logic, refactored into a function that returns the job
function getTestRunner(e, project) {
	console.log("running getTestRunner");
	// Create a new job
	var testRunner = new Job("test-runner");

	// use ruby:2.3 image
	testRunner.image = "alpine:latest";

	testRunner.env = {
		RACK_ENV:"test",
		EVENT_HOST:"http://example.com",
		IDENTITY_HOST:"http://example.com"
	};

	// Now we want it to run these commands in order:
	testRunner.tasks = [
		"echo 'hey dude'"
	];

	// Display logs from the job Pod
	testRunner.streamLogs = true;

	return testRunner;
}

// This runs our main test job, updating GitHub along the way
function runTests(e, project) {
	console.log("running runTests");

	// This Check Run image handles updating GitHub
	const checkRunImage = "deis/brigade-github-check-run:latest";

	// Common configuration
	const env = {
	  CHECK_PAYLOAD: e.payload,
	  CHECK_NAME: "Brigade",
	  CHECK_TITLE: "Run Tests",
	};

	// For convenience, we'll create three jobs: one for each GitHub Check stage
	const start = new Job("start-run", checkRunImage);
	start.imageForcePull = true;
	start.env = env;
	start.env.CHECK_SUMMARY = "Beginning test run";

	const end = new Job("end-run", checkRunImage);
	end.imageForcePull = true;
	end.env = env;

	// Now we run the jobs in order:
	// - Notify GitHub of start
	// - Run the tests
	// - Notify GitHub of completion
	//
	// On error, we catch the error and notify GitHub of a failure.
	start.run().then(() => {
	  return getTestRunner(e, project).run()
	}).then( (result) => {
	  end.env.CHECK_CONCLUSION = "success";
	  end.env.CHECK_SUMMARY = "Build completed";
	  end.env.CHECK_TEXT = result.toString();

	  // events.emit("tests-passed", e, project);
	  return end.run();
	}).catch( (err) => {
	  // In this case, we mark the ending failed.
	  end.env.CHECK_CONCLUSION = "failure";
	  end.env.CHECK_SUMMARY = "Build failed";
	  end.env.CHECK_TEXT = `Error: ${ err }`;

	  // events.emit("tests-failed", e, project);
	  return end.run();
	});
}

function buildDockerImage(e, project) {
	console.log("running buildDockerImage");
	events.emit("build-success", e, project);
}

function deployHelmChart(e, project) {
	console.log("running deployHelmChart");
	events.emit("deploy-success", e, project);
}

function notifySlackFailure(e, project) {
	console.log("running notifySlackFailure");
}

function notifySlackSuccess(e, project) {
	console.log("running notifySlackSuccess")
}
