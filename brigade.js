const { events, Job } = require("brigadier");

events.on("push", function(e, project) {
	console.log("received push for commit " + e.revision.commit);

	// Create a new job
	var node = new Job("test-runner");

	// We want our job to run the stock Docker Python 3 image
	node.image = "python:3";

	// Now we want it to run these commands in order:
	node.tasks = [
		"cd /src",
		"pip install -r requirements.txt",
		"python setup.py test"
	];

	// Display logs from the job Pod
	node.streamLogs = true;

	// We're done configuring, so we run the job
	node.run().then( () => {
		events.emit("test-done", e, project)
	});

});

events.on("test-done", (e, project) => {

	var dockerBuild = new Job("docker-build");

	dockerBuild.image = "docker:dind";
	dockerBuild.privileged = true;
	dockerBuild.env = {
		DOCKER_DRIVER: "overlay"
	};

	dockerBuild.env.DOCKER_USER = project.secrets.dockerLogin;
	dockerBuild.env.DOCKER_PASS = project.secrets.dockerPass;

	dockerBuild.tasks = [
		"dockerd-entrypoint.sh &",
		"sleep 20", // an arbitrary wait time
		"cd /src/",
		"docker build -t quay.io/sohohouse/georgekaz-brigade-test:latest ." ,
		"docker login -u $DOCKER_USER -p $DOCKER_PASS quay.io",
		"docker push quay.io/sohohouse/georgekaz-brigade-test:latest"
	];

	dockerBuild.run().then( () => {
		events.emit("build-done", e, project);
	});
});

events.on("build-done", (e, project) => {
	let deploy = new Job("deploy-runner", "quay.io/sohohouse/drone-helm:euwest1-prod")

	deploy.tasks = [
	  "cd /src/manifests/",
	  "kubectl apply -f deploy.yaml" // Apply the newly created deploy.yml file
	]
  
	deploy.run().then( () => {
	  // We'll probably want to do something with a successful deployment later
	  events.emit("success", e, project)
	})
  })