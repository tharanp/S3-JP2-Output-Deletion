// dependencies
var AWS = require('aws-sdk');
const S3_IMAGE_CSV_BUCKET = 'images-csv';
var path=require('path');
var docClient = new AWS.DynamoDB.DocumentClient({ region: 'us-east-1' });  //change to your region
var async = require('async');
var s3 = new AWS.S3();
var srcKey = '';
var metaData = [];
/**
 *  Delete jp2 file from digitalcollection-output bucket when image file deleted from digital collection ucket
 */
exports.handler = function (event, context, callback) {
	var srcBucket = event.Records[0].s3.bucket.name;
	srcKey = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, " "));
	console.log("srcKey: " + srcKey);
	var dstBucket = srcBucket + "-output";
	const S3_IMAGE_CSV_BUCKET = 'image-csv';
	var srcFileExt = srcKey.substr(srcKey.lastIndexOf('.') + 1);
	var srcFileKey = srcKey.substr(0, srcKey.lastIndexOf('.'));
	var srcBaseName = path.basename(srcKey);
	var dstKey = srcFileKey.toLowerCase().replace(/\s/g, '').replace(/\+/g, '') + ".jp2";	
	async.waterfall([function (wcallback) {		
		s3.deleteObject({
			Bucket: dstBucket,
			Key: dstKey
		}, function (err, data) {
			if (err) {
				console.log(err);
				wcallback(new Error('Unable to delete file.'));
			}
			else {				
				wcallback(null);
			}
		});
	},function (wcallback) {
		var params = {
			TableName: 'digitalcollection',
			Key: {
				FileKey: srcKey
			}			
		};
		docClient.get(params, function (err, data) {
			if (err) { console.log("get meta details error ", err); wcallback(err); }
			else {
				metaData = data.Items;
				console.log("metadata from dynamod",  data.Items);
				wcallback(null);
			}
		});
	}, function (wcallback) {

		var params = {
			TableName: "digitalcollection",
			Key: {
				FileKey: srcKey,
			}
		};		
		docClient.delete(params, function (err, data) {
			if (err) {
				console.error("Unable to delete item. Error JSON:", JSON.stringify(err, null, 2));			
				wcallback(err);
			} else {				
				wcallback(null);
			}
		});
	}], function (error, result) {
		if (error) { console.log("file delete function failed", error);
		 callback(error);
		 }
		else { callback(null); console.log("file delete function success") }
	})
};
