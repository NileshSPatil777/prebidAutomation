const { retry } = require("async");
const XLSX = require("xlsx");


function stringToBoolean(str) {
  switch (str.toLowerCase().trim()) {
    case "true": case "yes": case "1": case "required": return true;
    case "false": case "no": case "0": case null: case "optional": return false;
    default: return "Recheck this field type manually";
  }
}

function chooseParamType(str){
  let lowerStr = str.toLowerCase().trim();
  if(lowerStr.includes('[]') || lowerStr.includes('[') ||  lowerStr.includes(']') ||  lowerStr.match(/array/gi) ||  lowerStr.includes('<')){
    /**Its Array */
    if(lowerStr.match(/string/gi)){
      return {type : "ARRAY", subType : "STRING"};
    } else if(lowerStr.match(/integer/gi) || lowerStr.match(/int/gi) || lowerStr.match(/float/gi) || lowerStr.match(/number/gi)){
      return {type : "ARRAY", subType : "NUMERIC"};
    } else {
      return {type : "ARRAY", subType : "Not Available"};
    }
  } else if(lowerStr.match(/integer/gi)  || (lowerStr.match(/float/gi)) || (lowerStr.match(/number/gi)) || (lowerStr.match(/int/gi)) || (lowerStr.match(/decimal/gi))){
    /** Its Numeric */
    return "NUMERIC";
  } else if(lowerStr.match(/string/gi)){
    return "STRING";
  } else if(lowerStr.match(/object/gi)){
    return "OBJECT";
  } else if(lowerStr.match(/boolean/gi)){
    return "BOOLEAN";
  }
  else{
    return 0;
  }
}

function chooseRequired(str){
  let lowerStr = str.toLowerCase().trim();
  if(lowerStr.match(/required/gi) && (lowerStr.length > 9)){
    // its optional /
    return false;
  }
  else if(lowerStr.match(/required/gi) || lowerStr.match(/highly recommended/gi)){
    return true;
  }
  else if(lowerStr.match(/recommended/gi) || lowerStr.match(/optional/gi)){
    return false;
  }
  else return false;
}

function changeParamName(str){
  if(str.includes("*")) return str.replace("*","");
  else if(str.includes(".")){
    nameArr = str.split(".");
    return nameArr[0];
  }
  else return str;
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

function getAllUrls(dpDetails) {
  let allUrls = `${dpDetails.prebiDocUrl} \n${dpDetails.jsUrl} \n${dpDetails.mdUrl} \n${dpDetails.logoUrl} `;
  delete dpDetails.prebiDocUrl;
  delete dpDetails.mdUrl;
  delete dpDetails.jsUrl;
  delete dpDetails.logoUrl;
  dpDetails.allUrls = allUrls;
  return dpDetails;
}

function finalJsonFormat(dp,displayname,gdpr,tcf2,ccpa,schain){
  const jsonObject = {};
  jsonObject.code = dp;
  jsonObject.displayName = displayname;
  jsonObject.gdpr = gdpr;
  jsonObject.tcf2 = tcf2;
  jsonObject.ccpa = ccpa;
  jsonObject.schain = schain;
  return jsonObject;
}

function generateOutputFile(dpUrlArray, fileName) {
  try {
    //console.log('dpUrlArray---', dpUrlArray)
    const ws = XLSX.utils.json_to_sheet(dpUrlArray, { header: ["code", "displayName", "gdpr", "ccpa", "schain", "tcf2", "BidParams", "allUrls", "mediaTypesDocVal", "schainDocVal", "schainUrlVal", "gdprDocVal", "gdprUrlVal", "ccpaDocVal", "ccpaUrlVal", "tcf2UrlVal", "gvlIdDocVal", "gvlIdJsonVal","finalJson"] }
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
  getAllUrls: getAllUrls,
  finalJsonFormat: finalJsonFormat,
  generateOutputFile:generateOutputFile,
  deriveFinalValue: deriveFinalValue,
  chooseRequired: chooseRequired,
  changeParamName: changeParamName,
  generateOutputFile: generateOutputFile
};
