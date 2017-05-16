
var cron = require("node-cron"),
	in_array = require("in_array"),
	fs = require("fs"),
	base64 = require("base64-stream"),
	path = require("path"),
	multer = require("multer"),
	google = require("googleapis"),
	OAuth2 = google.auth.OAuth2,
	Imap = require("imap"),/*eslint-disable*/
    upload = multer({ dest: "uploads/" }); /*eslint-enable*/
// var DB = require("./mongodb/db"),
	// email = DB.get_schema();
var config = require("./config.json");
var imap_server = require("./mongodb/imap");
var oauth2Client = new OAuth2(config.CLIENT_ID, config.CLIENT_SECRET, config.REDIRECT_URL);
oauth2Client.setCredentials({
	access_token: config.access_token,
	token_type: config.token_type,
	expires_in: config.expires_in,
	refresh_token: config.refresh_token
});
var drive = google.drive({ version: "v2", auth: oauth2Client });
// import db from "../db";
// var db = require("./db");


module.exports = {
	hello: function(email) {
		// cron.schedule("10 * * * * *", function() {
		// console.log("running a task every 10sec");
		imap_server.findOne({ where: { "active": "True" } }).then(function(docs, err) {
			if (docs) {
				console.log(docs);
				imap = new Imap({
		        	user: docs.dataValues.email,
		        	password: docs.dataValues.password,
		        	host: docs.dataValues.imap_server,
		        	port: docs.dataValues.server_port,
		        	tls: docs.dataValues.type,
				});  /*eslint-disable*/

				function openInbox(cb) { /*eslint-enable*/
					imap.openBox("INBOX", true, cb);
				}
				var headers = {},
					bodyMsg = "";
				var imap;
				imap.once("ready", function() {
					openInbox(function() {
		      // this will fetch all the Emails data from Gmail
						var f = imap.seq.fetch("1:10000000", {
							bodies: ["HEADER.FIELDS (FROM TO SUBJECT BCC CC DATE)", "TEXT"],
							struct: true
						});
						f.on("message", function(msg, seqno) {
							var prefix = "(#" + seqno + ") ";
							msg.on("body", function(stream) {
								var buffer = "";
								stream.on("data", function(chunk) {
									buffer += chunk.toString("utf8");
								});
								stream.once("end", function() {
									headers = Imap.parseHeader(buffer);
									var hash = buffer.substring(buffer.indexOf("<div")),
										textmsg = hash.substring(0, hash.lastIndexOf("</div>"));
									if (textmsg !== "") {
										bodyMsg = textmsg + "</div>";
									}
								});
							});
							msg.once("attributes", function(attrs) {
								var attachments = findAttachmentParts(attrs.struct);
								var len = attachments.length,
									uid = attrs.uid,
									flag = attrs.flags;
								for (var i = 0; i < len; ++i) {
									var attachment = attachments[i];
									var f = imap.fetch(attrs.uid, {
										bodies: [attachment.partID],
										struct: true
									});
								}
								if (attachments[0] == null) {
									database_save(attachments, uid, flag, bodyMsg, seqno);
								} else {
									f.on("message", buildAttMessageFunction(attachment, uid, flag, bodyMsg, seqno));
								}
							});
							msg.once("end", function() {
								console.log(prefix + "Finished");
							});
						});
						f.once("error", function(err) {
							console.log("Fetch error: " + err);
						});
						f.once("end", function() {
							console.log("Done fetching all messages!");
							imap.end();
						});
					});
				}); /*eslint-disable*/

		function findAttachmentParts(struct, attachments) { /*eslint-enable*/
			attachments = attachments || [];
			var len = struct.length;
			for (var i = 0; i < len; ++i) {
				if (Array.isArray(struct[i])) {
					findAttachmentParts(struct[i], attachments);
				} else if (struct[i].disposition && ["INLINE", "ATTACHMENT"].indexOf(struct[i].disposition.type) > 0) {
					attachments.push(struct[i]);
				}
			}
			return attachments;
		} /*eslint-disable*/

		function buildAttMessageFunction(attachment, uid, flag, bodyMsg) { /*eslint-enable*/
			var filename = attachment.params.name;
			var encoding = attachment.encoding;
			var filepath = path.join(__dirname, "/./uploads/", filename);
			return function(msg, seqno) {
				var prefix = "(#" + seqno + ") ";
				msg.on("body", function(stream) {
					var writeStream = fs.createWriteStream(filepath);
					if (encoding === "BASE64") {
						stream.pipe(base64.decode()).pipe(writeStream);
					} else {
						stream.pipe(writeStream);
					}
					fs.readFile(filepath, {
						encoding: "utf8"
					}, function(error, data) {
						var fileMetadata = {
							title: filename,
							mimeType: "text/plain/javascript/html/csv/application/pdf"
						};
						var media = {
							mimeType: "text/plain/javascript/html/csv/application/pdf",
							body: data
						};
		                        // drive.files.insert({
		                        // 	resource: fileMetadata,
		                        // 	media: media,
		                        // 	fields: "id"
		                        // }, function(err, file) {
		                        // 	if (!err) {
		                        // 		/*eslint-disable*/
		                        // 		attachment_file = [{
		                        // 			name: attachment.params.name,
		                        // 			link: "https://drive.google.com/file/d/" + file.id + "/view"
		                        // 		}];
		                        // 		database_save(attachment_file, uid, flag, bodyMsg, seqno); /*eslint-enable*/
		                        // 		console.log("file is saved");
		                        // 	} else {
		                        // 		console.log(err);
		                        // 	}
		                        // });
					});
					fs.unlink(filepath, function() {
						console.log("success");
					});
				});
				msg.once("end", function() {
					console.log(prefix + "Finished attachment %s", filename);
				});
			};
		} /*eslint-disable */

		function database_save(attachments, uid, flag, bodyMsg, seqno) { /* eslint-enable*/
			var emailid = seqno,
				to = headers.to.toString();
			var hash1 = headers.from.toString().substring(headers.from.toString().indexOf("\"")),
				from = hash1.substring(0, hash1.lastIndexOf("<"));
			var hash = headers.from.toString().substring(headers.from.toString().indexOf("<") + 1),
				sender_mail = hash.substring(0, hash.lastIndexOf(">"));
			var date = headers.date.toString(),
				email_date = new Date(date).getFullYear() + "-" + (new Date(date).getMonth() + 1) + "-" + new Date(date).getDate(),
				email_timestamp = new Date(date).getTime(),
				subject = headers.subject.toString(),
				unread = in_array("[]", flag),
				answered = in_array("\\Answered", flag),
				message = bodyMsg,
				attachment = attachments;

			var detail = new email({
		            	"email_id": emailid,
		            	"to": to,
		            	"from": from,
		            	"sender_mail": sender_mail,
		            	"date": date,
		            	"email_date": email_date,
		            	"email_timestamp": email_timestamp,
		            	"subject": subject,
		            	"uid": uid,
		            	"unread": unread,
		            	"answered": answered,
		            	"body": message,
		            	"attachment": attachment
			});
			detail.save(function(err) {
		            	if (err) {
		            		console.log("Duplicate Data");
		            	} else {
		            		console.log("data saved successfully");
		            	}
			});
		}

				imap.once("error", function(err) {
					console.log(err);
				});
				imap.once("end", function() {
					console.log("Connection ended");
				});
				imap.connect();
			} else {
				console.log(err);
			}
		});
		// });

	}
};
