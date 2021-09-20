
const commonService = require("./commonService");

function getPrebidDocInfo($, dpDetails) {

  if ($('.bs-docs-section').find('h2').first()) {
    let displayName = $('.bs-docs-section').find('h2').first().text();
    if (displayName != undefined) {
      dpDetails.displayName = displayName;
    }
  }

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
          paramObj.required = commonService.paramRequire(params);
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

  return dpDetails;
}
module.exports = {
  getPrebidDocInfo: getPrebidDocInfo
}