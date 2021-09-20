//v1.2

const request = require("request");
const async = require("async");
const XLSX = require("xlsx");
const cheerio = require("cheerio");
const { val } = require("cheerio/lib/api/attributes");
const commonService = require("./services/commonService");
const prebidDocService = require("./services/prebidDoc.service");
const readmeMdService = require("./services/readmeMd.service");
const version = "5.9.0";
const fileName = "dp_list_test.xlsx";
const workbook = XLSX.readFile(`./${fileName}`);
const docUrl = "https://docs.prebid.org/dev-docs/bidders/";
const tcf2Link = "https://iabeurope.eu/vendor-list-tcf-v2-0/";
const baseUrl = `https://github.com/prebid/Prebid.js/blob/${version}/modules/`;
const gdprDocUrl = "https://docs.prebid.org/dev-docs/modules/consentManagement.html#adapters-supporting-gdpr";
const ccpaDocUrl = "https://docs.prebid.org/dev-docs/modules/consentManagementUsp.html#adapters-supporting-us-privacy--ccpa";
const schainUrl = "https://docs.prebid.org/dev-docs/modules/schain.html";
const tcf2JsonUrl = "https://vendor-list.consensu.org/v2/vendor-list.json";
const dpUrlArray = [];
var readMeUrl, jsUrl;

async.waterfall(
  [
    (wCallback) => {
      // get the list from excel
      const sheet_name_list = workbook.SheetNames;
      const xlData = XLSX.utils.sheet_to_json(workbook.Sheets[sheet_name_list[0]]);
      let dpList = [];
      xlData.forEach((data) => { dpList.push(Object.values(data)[0]); });
      let schainSupportedDps, gdprSupportedDps, ccpaSupportedDps, tcf2SupportedDps,tcf2SupportedJsonDps , schainUrlVal;
      async.parallel({
        getSchainSupportedDPs: function (outerPcallback) {
          request(schainUrl, function (error, response, body) {
            if (!error && response.statusCode == 200) {
              const $ = cheerio.load(body);
              if ($("body > div.container.pb-docs-container > div > div.col-lg-9 > div > div.adapters > div.schain_supported")) {
                schainSupportedDps = $("body > div.container.pb-docs-container > div > div.col-lg-9 > div > div.adapters > div.schain_supported").text();
                outerPcallback(null, schainSupportedDps);
              }
            } else {
              console.log("Unable to get values of schainSupportedDps. Please Check schainUrlVal manually !");
              outerPcallback("Error", schainSupportedDps);
            }
          });
        },
        gdprSupportedDps: function (outerPcallback) {
          request(gdprDocUrl, function (error, response, body) {
            if (!error && response.statusCode == 200) {
              const $ = cheerio.load(body);
              gdprSupportedDps = ($('body').find('script:contains("idx_gdpr")').html());
              outerPcallback(null, gdprSupportedDps)
            } else {
              outerPcallback(error, gdprSupportedDps);
            }
          });
        },
        ccpaSupportedDps: function (outerPcallback) {
          request(ccpaDocUrl, function (error, response, body) {
            if (!error && response.statusCode == 200) {
              const $ = cheerio.load(body);
              ccpaSupportedDps = ($('body').find('script:contains("idx_usp")').html());
              outerPcallback(null, ccpaSupportedDps);
            } else {
              outerPcallback(error, ccpaSupportedDps)
            }
          });
        },
        tcf2SupportedDps: function (outerPcallback) {
          request(tcf2Link, function (error, response, body) {
            if (!error && response.statusCode == 200) {
              const $ = cheerio.load(body);
              tcf2SupportedDps = $(`table:contains()`).text();
              outerPcallback(null, tcf2SupportedDps);
            } else {
              outerPcallback('Error', tcf2SupportedDps);
            }
          })
        },
        tcf2JsonGvl: function (outerPcallback) {
          let options = { json: true };
          request(tcf2JsonUrl, options, (error, res, body) => {
            if (error) {
              outerPcallback("Absent", "");
            }
            else {
              outerPcallback(null, Object.values(body.vendors));
            }
          })
        }
      }, function (err, pResult) {
        //console.log('---->> final p call back', pResult)
        //process.exit();
        if (err) wCallback(err, dpList, pResult)
        else wCallback(null, dpList, pResult)
      })
    },
    //convert dplist into array and generate prebid doc link
    (dpList, allReqUrlResult, wCallback) => {
      console.log("Inside next function");
      async.eachSeries(
        dpList,
        function (dp, eCallback) {
          console.log('Processing for -->>', dp)
          //process.exit(); 
          let dpDetails = {};
          dpDetails.code = dp;

          async.parallel(
            {
              getPrebidDocUrl: function (pCallback) {
                async.waterfall([
                  (innerWcallback) => {
                    request(docUrl + dp, function (error, response, body) {
                      if (!error && response.statusCode == 200) {
                        dpDetails.prebiDocUrl = docUrl + dp;
                        const $ = cheerio.load(body);
                        prebidDocService.getPrebidDocInfo($,dpDetails);
                        innerWcallback(null, dpDetails.displayName);
                      } else {
                        dpDetails.prebiDocUrl = "prebid doc url not found.";
                        innerWcallback(error, '');
                      }
                    })
                  },
                  (displayName, innerWcallback) => {
                    commonService.getFinalgdprCcpaSchainTcf2(allReqUrlResult,dpDetails);
                    console.log('DP DETAILS-------', dpDetails)
                    innerWcallback(null)

                  }
                ], (err, result) => {
                  if (err) {
                    pCallback(err)
                  } else {
                    pCallback(null);
                  }
                })
              },
              // generate js link with line number for isBidRequestValid function
              getJsUrl: function (pCallback) {
                jsUrl = baseUrl + dp + "BidAdapter.js";
                request(jsUrl, function (error, response, body) {
                  if (!error && response.statusCode == 200) {
                    const $ = cheerio.load(body);
                    if ($('.pl-en:contains("isBidRequestValid")')) {
                      var category = $('.pl-en:contains("isBidRequestValid")')
                        .parent()
                        .attr("id");
                      if (category != undefined) {
                        linenumber = category.replace("LC", "L");
                        dpDetails.jsUrl = jsUrl + "#" + linenumber;
                      }
                    }
                  } else {
                    dpDetails.jsUrl = "js file url not found.";
                  }
                  pCallback(null);
                });
              },
              //generate md or readme file link
              getReadMeUrl: function (pCallback) {
                readMeUrl = baseUrl + dp + "BidAdapter.md";
                request(readMeUrl, function (error, response, body) {
                  if (!error && response.statusCode == 200) {
                    dpDetails.mdUrl = readMeUrl;
                    const $ = cheerio.load(body);
                    readmeMdService.getLogoUrl($,dpDetails)
                  } else {
                    dpDetails.mdUrl = "md file url not found.";
                  }
                  pCallback(null);
                });
              }
            },
            function (err, results) {
              commonService.getAllUrls(dpDetails);
              dpUrlArray.push(dpDetails);
              eCallback(null);
            }
          );
        },
        function (err, aRes) {
          commonService.generateOutputFile(dpUrlArray,fileName);
          
        },
        wCallback(null)
      );
    },
  ],
  function (err, result) {
    if (err){
      console.log("Error Occored",err.message || err);
    } else
    console.log("Processing>>>>>");
  }
);