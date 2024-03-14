const express = require("express");
const fs = require("fs");
const https = require("https");
const tar = require("tar");
const { exec } = require("child_process");

const app = express();

const phishingDomainsUrl =
	"https://raw.githubusercontent.com/mitchellkrogza/Phishing.Database/master/ALL-phishing-domains.tar.gz";
const phishingDomainsFilePath = "./ALL-phishing-domains.txt";

function downloadPhishingDomains() {
	const file = fs.createWriteStream("./phishing-domains.tar.gz");
	console.log("downloading file");
	https
		.get(phishingDomainsUrl, (response) => {
			response.pipe(file);
			file.on("finish", () => {
				file.close(() => {
					console.log(
						"Phishing domains file downloaded successfully",
					);
					extractPhishingDomains();
				});
			});
		})
		.on("error", (err) => {
			fs.unlink("./phishing-domains.tar.gz");
			console.error(
				`Error downloading phishing domains file: ${err.message}`,
			);
		});
}

function extractPhishingDomains() {
	fs.createReadStream("./phishing-domains.tar.gz")
		.pipe(
			tar.x({
				C: "./",
				sync: true,
			}),
		)
		.on("end", () => {
			console.log("Phishing domains file extracted successfully");
			fs.unlinkSync("./phishing-domains.tar.gz");
		})
		.on("error", (err) => {
			console.error(
				`Error extracting phishing domains file: ${err.message}`,
			);
		});
}

function checkPhishingDomain(url, callback) {
	const command = `grep -P '(^|\\s)\\K${url}(?=\\s|$)' ${phishingDomainsFilePath}`;
	exec(command, (error, stdout, stderr) => {
		if (error) {
			console.error(
				`Error checking for phishing domain: ${error.message}`,
			);
			callback(false);
			return;
		}
		if (stderr) {
			console.error(`Error checking for phishing domain: ${stderr}`);
			callback(false);
			return;
		}
		if (stdout) {
			callback(true);
		} else {
			callback(false);
		}
	});
}

setInterval(downloadPhishingDomains, 24 * 60 * 60 * 1000);

app.get("/check", (req, res) => {
	const urlToCheck = req.query.url;
	if (!urlToCheck) {
		res.status(400).send("URL parameter is required");
		return;
	}
	checkPhishingDomain(urlToCheck, (isPhishing) => {
		res.send({ isPhishing });
	});
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}`);
});
downloadPhishingDomains();
