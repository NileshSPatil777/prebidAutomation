const request = require("request");
const async = require("async");
const XLSX = require("xlsx");
const cheerio = require("cheerio");
const commonService = require("./services/commonService");
const prebidDocService = require("./services/prebidDoc.service");
const readmeMdService = require("./services/readmeMd.service");
const config = require('config');
const urls = config.get('urls');
const workbook = XLSX.readFile(`./${config.fileName}`);
const baseUrl = `https://github.com/prebid/Prebid.js/blob/${config.version}/modules/`;
const generateNewDPSql = require('../prebidAutomation/services/generateNewDPSql');
var dpList, dpUrlArray,newDpFinalListArray= [];

const sheet_name_list = workbook.SheetNames;
// sheet_name_list.forEach(oneSheet => {const xlData = XLSX.utils.sheet_to_json(workbook.Sheets[oneSheet]);
//   dpList = [];
//   xlData.forEach((data) => { dpList.push(Object.values(data)[0]); });
//   prebidAutomation(dpList,oneSheet)
// });
async.eachSeries(sheet_name_list, (oneSheet, sheetReadCallback) => {
  const xlData = XLSX.utils.sheet_to_json(workbook.Sheets[oneSheet]);
  dpList = [];
  xlData.forEach((data) => { dpList.push(Object.values(data)[0]); });
  prebidAutomation(dpList,oneSheet, (err) =>{
    if(err) sheetReadCallback(err);
    else sheetReadCallback(null);
  });
},function(err,result){
  console.log("Successful");
  /** call to added dp script */
  generateNewDPSql.getInputDpArray(newDpFinalListArray, function(err, success){
    if(err) console.log("Error", err)
    else console.log("Successful...")
  })
})

async function prebidAutomation(dpList,sheetName,prebidAutomationCallback){
  console.log(dpList);
  dpUrlArray = [];
  var readMeUrl, jsUrl; 
  async.waterfall(
    [
      (wCallback) => {
        // get the list from excel
        let schainSupportedDps, gdprSupportedDps, ccpaSupportedDps, tcf2SupportedDps;
        async.parallel({
          getSchainSupportedDPs: function (outerPcallback) {
            request(urls.schainUrl, function (error, response, body) {
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
            request(urls.gdprDocUrl, function (error, response, body) {
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
            request(urls.ccpaDocUrl, function (error, response, body) {
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
            request(urls.tcf2Link, function (error, response, body) {
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
            request(urls.tcf2JsonUrl, options, (error, res, body) => {
              if (error) {
                outerPcallback("Absent", "");
              }
              else {
                outerPcallback(null, Object.values(body.vendors));
              }
            })
          }
        }, function (err, pResult) {
          if (err) wCallback(err, dpList, pResult)
          else wCallback(null, dpList, pResult)
        })
      },
      //convert dplist into array and generate prebid doc link
      (dpList, allReqUrlResult, wCallback) => {
        async.eachSeries(
          dpList,
          function (dp, eCallback) {
            console.log('Processing for -->>', dp) 
            let dpDetails = {};
            dpDetails.code = dp;

            async.parallel(
              {
                getPrebidDocUrl: function (pCallback) {
                  async.waterfall([
                    (innerWcallback) => {
                      request(urls.docUrl + dp, function (error, response, body) {
                        if (!error && response.statusCode == 200) {
                          dpDetails.prebiDocUrl = urls.docUrl + dp;
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
                          pCallback(null);
                        }
                        else pCallback(null);
                      }
                      else pCallback(null);
                    } else {
                      dpDetails.jsUrl = "js file url not found." + error + dp + response.statusCode;
                      pCallback(null);
                    }
                  });
                },
                //generate md or readme file link
                getReadMeUrl: function (pCallback) {
                  readMeUrl = baseUrl + dp + "BidAdapter.md";
                  request(readMeUrl, function (error, response, body) {
                    if (!error && response.statusCode == 200) {
                      dpDetails.mdUrl = readMeUrl;
                      const $ = cheerio.load(body);
                      readmeMdService.getLogoUrl($,dpDetails);
                      pCallback(null);
                    } else {
                      dpDetails.mdUrl = "md file url not found." + error + dp + response.statusCode;
                      pCallback(null);
                    }
                  });
                }
              },
              function (err, results) {
                commonService.getFinalDpDetails(dpDetails);
                console.log("type of-->>", typeof(dpDetails))
                dpUrlArray.push(dpDetails); 
                if(sheetName == "Added"){
                  newDpFinalListArray.push(JSON.parse(dpDetails.finalJson));
                }         
                eCallback(null);
              }
            );
          },
          function (err, aRes) {
           commonService.generateOutputFile(dpUrlArray,config.fileName,sheetName,(err) =>{
             if(err) wCallback(err);
             else wCallback(null);
           });
          },
        );
      },
    ],
    function (err, result) {
      if (err){
        console.log("Error Occurred",err.message || err);
        prebidAutomationCallback(err);
      } else
      console.log("Processing>>>>>");
      prebidAutomationCallback(null);
    }
  );
}


//module.exports = newDpFinalListArray;