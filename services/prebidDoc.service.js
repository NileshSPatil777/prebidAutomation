
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
    var paramObjArr = [];
    $('table:contains("Scope")').find('tbody').find('tr').each(function (i, elem) {
      var paramObj = {};
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
      paramObjArr.push(paramObj);
    });
  }
  bidParamObj = paramObjArr;  
  dpDetails.BidParams = JSON.stringify(paramObjArr,null,4);
  return {dpDetails:dpDetails, bidParamObj:bidParamObj};
}
module.exports = {
  getPrebidDocInfo: getPrebidDocInfo
}