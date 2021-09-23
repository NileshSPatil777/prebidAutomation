const XLSX = require("xlsx");

function stringToBoolean(str) {
  switch (str.toLowerCase().trim()) {
    case "true": case "yes": case "1": case "required": return true;
    case "false": case "no": case "0": case null: case "optional": return false;
    default: return "Recheck this field type manually";
  }
}

function chooseParamType(str) {
  switch (str.toLowerCase().trim()) {
    case "integer": case "float": case "number": case "numeric": return "NUMERIC";
    case "object": return "OBJECT";
    case "boolean": return "BOOLEAN";
    case "array": return "ARRAY";
    case "string": return "STRING";
    case "required": return true;
    case "optional": return false;
    default: return str;
  }
}

function deriveFinalValue(docVal, urlVal) {
  if (docVal === urlVal)
    return urlVal;
  else
    return "Recheck";
}

function getTcf2Val(tcf2UrlVal, gvlIdDocVal, gvlIdJsonVal) {
  if (tcf2UrlVal === true && (typeof (gvlIdDocVal) === "number" || typeof (gvlIdJsonVal) === "number")) {
    return true;
  } else if (tcf2UrlVal === false && (typeof (gvlIdDocVal) === "string" || typeof (gvlIdJsonVal) === "string")) {
    return false;
  } else {
    return "Recheck";
  }
}

function getTcf2JsonVal(dpname, allReqUrlResult) {
  if (dpname) {
    let demandPartner = new RegExp(dpname, 'i');
    let result = allReqUrlResult.tcf2JsonGvl.find(obj => {
      return obj.name.match(demandPartner);
    })
    if (result)
      return (result.id);
    else {
      return null;
    }
  }
  else {
    return "Display code absent";
  }
}

function getFinalDpDetails(dpDetails) {
  dpDetails.allUrls = `${dpDetails.prebiDocUrl} \n${dpDetails.jsUrl} \n${dpDetails.mdUrl} \n${dpDetails.logoUrl} `;
  delete dpDetails.prebiDocUrl;
  delete dpDetails.mdUrl;
  delete dpDetails.jsUrl;
  delete dpDetails.logoUrl;
  finalJsonFormat(dpDetails);
}

function finalJsonFormat(dpDetails){
  const jsonObject = {};
  jsonObject.code = dpDetails.code;
  jsonObject.displayName = dpDetails.displayname;
  jsonObject.gdpr = dpDetails.gdpr;
  jsonObject.tcf2 = dpDetails.tcf2;
  jsonObject.ccpa = dpDetails.ccpa;
  jsonObject.schain = dpDetails.schain;
  jsonObject.params = dpDetails.bidParamObj;
  dpDetails.finalJson = JSON.stringify(jsonObject,null,4);
  delete dpDetails.bidParamObj;
  dpDetails.newDpList = `${dpDetails.allUrls} \n${dpDetails.finalJson}`;
  return dpDetails;
}

function generateOutputFile(dpUrlArray, fileName) {
  try {
    //console.log('dpUrlArray---', dpUrlArray)
    const ws = XLSX.utils.json_to_sheet(dpUrlArray, { header: ["code", "displayName", "gdpr", "ccpa", "schain", "tcf2", "BidParams","allUrls","newDpList","finalJson", "mediaTypesDocVal", "schainDocVal", "schainUrlVal", "gdprDocVal", "gdprUrlVal", "ccpaDocVal", "ccpaUrlVal", "tcf2UrlVal", "gvlIdDocVal", "gvlIdJsonVal"] }
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "PrebidDpDetails");
    XLSX.writeFile(wb, `./${fileName}`);
    console.log("Check PrebidDpDetails of file dp_list_test.xlsx ");
  } catch (err) {
    const message = err.message;
    const code = err.code;
    if (code === "EBUSY") {
      console.log(`Please close the file ${fileName} and try again!`);
    } else {
      console.log("Please retry after resolution of error:", message);
    }
  }
}

function getFinalgdprCcpaSchainTcf2(allReqUrlResult, dpDetails) {
  dpDetails.gdprUrlVal = allReqUrlResult.gdprSupportedDps.includes(dpDetails.displayName);
  dpDetails.gdpr = deriveFinalValue(dpDetails.gdprDocVal, dpDetails.gdprUrlVal);

  dpDetails.ccpaUrlVal = allReqUrlResult.ccpaSupportedDps.includes(dpDetails.displayName);
  dpDetails.ccpa = deriveFinalValue(dpDetails.ccpaDocVal, dpDetails.ccpaUrlVal);

  dpDetails.schainUrlVal = allReqUrlResult.getSchainSupportedDPs.includes(dpDetails.displayName);
  dpDetails.schain = deriveFinalValue(dpDetails.schainDocVal, dpDetails.schainUrlVal);

  dpDetails.gvlIdJsonVal = getTcf2JsonVal(dpDetails.displayName, allReqUrlResult);

  let toMatchDp = new RegExp(dpDetails.code, 'gi');
  let dpData = allReqUrlResult.tcf2SupportedDps.match(toMatchDp);
  if (dpData != null) {
    dpDetails.tcf2UrlVal = true;
  } else {
    dpDetails.tcf2UrlVal = false;
  }
  dpDetails.tcf2 = getTcf2Val(dpDetails.tcf2UrlVal, dpDetails.gvlIdDocVal, dpDetails.gvlIdJsonVal);
  return dpDetails;
}

module.exports = {
  chooseParamType: chooseParamType,
  stringToBoolean: stringToBoolean,
  getTcf2JsonVal: getTcf2JsonVal,
  getTcf2Val: getTcf2Val,
  getFinalgdprCcpaSchainTcf2: getFinalgdprCcpaSchainTcf2,
  getFinalDpDetails: getFinalDpDetails,
  finalJsonFormat: finalJsonFormat,
  generateOutputFile:generateOutputFile,
  deriveFinalValue: deriveFinalValue,
  generateOutputFile: generateOutputFile
};
