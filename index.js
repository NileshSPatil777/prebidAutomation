//v1.2

const request = require("request");
const async = require("async");
const XLSX = require("xlsx");
const cheerio = require("cheerio");
const { val } = require("cheerio/lib/api/attributes");
const commonService = require("./services/commonService");
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
      let schainSupportedDps, gdprSupportedDps, ccpaSupportedDps, tcf2SupportedDps,tcf2SupportedJsonDps, gdprUrlVal, ccpaUrlVal, schainUrlVal;
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
              //let toMatchDp = new RegExp(dp, 'gi');
              tcf2SupportedDps = $(`table:contains()`).text();
              //var dpData = check.match(toMatchDp); 
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
              outerPcallback(null, body);
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
                        const $ = cheerio.load(body);
                        if ($('.bs-docs-section').find('h2').first()) {
                          var displayCode = $('.bs-docs-section').find('h2').first().text();
                          if (displayCode != undefined) {
                            dpDetails.displayName = displayCode;
                            schainUrlVal = allReqUrlResult.getSchainSupportedDPs.includes(dpDetails.displayName);
                          }
                        }
                        dpDetails.prebiDocUrl = docUrl + dp;
                        const gdprDocVal = $(
                          "tr:contains(GDPR TCF Support)> td:nth-child(4)"
                        ).text();
                        const ccpaDocVal = $(
                          "tr:contains(USP/CCPA Support)> td:nth-child(4)"
                        ).text();
                        const schainDocVal = $(
                          "tr:contains(Supply Chain Support)> td:nth-child(2)"
                        ).text();
                        const gvlIdDocVal = $(
                          "tr:contains(IAB GVL ID)> td:nth-child(2)"
                        ).text();
                        const mediaTypesDocVal = $(
                          "tr:contains(Media Types)> td:nth-child(2)"
                        ).text();

                        dpDetails.gdprDocVal = commonService.stringToBoolean(gdprDocVal);
                        dpDetails.ccpaDocVal = commonService.stringToBoolean(ccpaDocVal);
                        dpDetails.schainDocVal = commonService.stringToBoolean(schainDocVal);
                        dpDetails.gvlIdDocVal = gvlIdDocVal;
                        dpDetails.mediaTypesDocVal = mediaTypesDocVal;
                        var paramObjStr = "";

                        if ($('table:contains("Scope")')) {
                          var nameIndex, scopeIndex, typeIndex;
                          $('table:contains("Scope")').find('thead').each(function () {
                            $(this).find('tr').find('th').each(function (headingIndex, headingElement) {
                              if ($(this).text().match(/Name/g)) { nameIndex = headingIndex; }

                              if ($(this).text().match(/Key/g)) { nameIndex = headingIndex; }

                              if ($(this).text().match(/Scope/g)) { scopeIndex = headingIndex; }

                              if ($(this).text().match(/Type/g)) { typeIndex = headingIndex; }
                            })
                          })
                          var paramObj = {};
                          $('table:contains("Scope")').find('tbody').find('tr').each(function (i, elem) {
                            $(this).find('td').each(function (index, element) {
                              var params = $(element).text();
                              if (index == nameIndex) {
                                paramObj.paramName = params;
                              } else if (index == scopeIndex) {
                                paramObj.required = commonService.chooseParamType(params);
                              } else if (index == typeIndex) {
                                paramObj.paramType = commonService.chooseParamType(params);
                              }

                            })
                            paramObjStr = paramObjStr.concat(JSON.stringify(paramObj));
                          });
                        }
                        paramObjStr = paramObjStr.replace("\"", "");
                        paramObjStr = paramObjStr.replace("}/g", "},");
                        dpDetails.BidParams = paramObjStr;
                        innerWcallback(null, displayCode);
                      } else {
                        dpDetails.prebiDocUrl = "prebid doc url not found.";
                        innerWcallback(error, '');
                      }
                    })
                  },
                  (displayCode, innerWcallback) => {

                    gdprUrlVal = allReqUrlResult.gdprSupportedDps.includes(displayCode);
                    ccpaUrlVal = allReqUrlResult.ccpaSupportedDps.includes(displayCode);

                    dpDetails.gdprUrlVal = gdprUrlVal;
                    dpDetails.gdpr = commonService.getSchainGdprCcpaVal(dpDetails.gdprDocVal, gdprUrlVal);

                    dpDetails.ccpaUrlVal = ccpaUrlVal;
                    dpDetails.ccpa = commonService.getSchainGdprCcpaVal(dpDetails.ccpaDocVal, ccpaUrlVal);

                    dpDetails.schainUrlVal = schainUrlVal;
                    dpDetails.schain = commonService.getSchainGdprCcpaVal(dpDetails.schainDocVal, schainUrlVal);
                    dpDetails.gvlIdJsonVal = commonService.getTcf2JsonVal(displayCode,allReqUrlResult);

                    let toMatchDp = new RegExp(dp, 'gi');
                    let dpData = allReqUrlResult.tcf2SupportedDps.match(toMatchDp);
                    if (dpData != null) {
                      dpDetails.tcf2UrlVal = true;
                    } else {
                      dpDetails.tcf2UrlVal = false;
                    }
                    dpDetails.tcf2 = commonService.getTcf2Val(dpDetails.tcf2UrlVal, dpDetails.gvlIdDocVal, dpDetails.gvlIdJsonVal);

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
                    if (
                      $('div[id = "readme"]').find("p").find("a").attr("href")
                    ) {
                      var logo1 = $('div[id = "readme"]')
                        .find("p")
                        .find("a")
                        .attr("href");
                      if (logo1 != undefined) {
                        var logoUrl = logo1.split("@")[1];
                        dpDetails.logoUrl = "https://www." + logoUrl;
                      }
                    } else if (
                      $(
                        'div[class = "snippet-clipboard-content position-relative"]:contains("Maintainer")'
                      )
                        .find("pre")
                        .find("code")
                    ) {
                      var logo2 = $(
                        'div[class = "snippet-clipboard-content position-relative"]:contains("Maintainer")'
                      )
                        .find("pre")
                        .find("code")
                        .text();
                      if (logo2 != undefined) {
                        var logoUrl = logo2.split("@")[1];
                        dpDetails.logoUrl = "https://www." + logoUrl;
                      }
                    } else {
                      var logo3 = $('div[id = "readme"]')
                        .find("ul")
                        .find('li:contains("Maintainer")')
                        .find("code")
                        .text();
                      if (logo3 != undefined) {
                        dpDetails.logoUrl = "https://www." + logo3;
                      }
                    }
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

