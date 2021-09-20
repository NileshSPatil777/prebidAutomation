const XLSX = require("xlsx");


function stringToBoolean(str) {
  switch (str.toLowerCase().trim()) {
    case "true": case "yes": case "1": case "required": return true;
    case "false": case "no": case "0": case null: case "optional": return false;
    default: return "Recheck this field type manually";
  }
}

function paramRequire(str){
  switch (str.toLowerCase().trim()) {
    case "required": return true;
    case "optional": return false;
  }
}

function chooseParamType(str) {
  switch (str.toLowerCase().trim()) {
    case "integer": case "float": case "number": case "Number" :case "NUMERIC": case "Numeric" : case "int" : case "integer-" : case "Number[]" : case "Integer" : case "Integer / Integer[]" :case "Float" : case "Number[Number[]]" : case "decimal" : return "numeric" ;
    case "object": case "Object" : return "object";
    case "boolean": case "Boolean" : return "boolean";
    case "array": return "array";
    case "string": case "string[]" : case "[string]" : case "String" : case "String[]" :return "string";
    default: return str;
  }
}

function getSchainGdprCcpaVal(docVal, urlVal) {
  if (docVal === urlVal)
    return urlVal;
  else
    return "Recheck";
}

function getTcf2Val(tcf2UrlVal, gvlIdDocVal,gvlIdJsonVal) {
  if (tcf2UrlVal=== true && (typeof(gvlIdDocVal)==="number" || typeof(gvlIdJsonVal)==="number")){
    return true;
  } else if(tcf2UrlVal=== false && (typeof(gvlIdDocVal)==="string" || typeof(gvlIdJsonVal)==="string")){
    return false;
  } else {
    return "Recheck";
  }
}

function getTcf2JsonVal(dpname,allReqUrlResult) {
  for (const vendor of Object.values(allReqUrlResult.tcf2JsonGvl.vendors)) {
    const map = new Map(Object.entries(vendor));
    if (map.get("name").includes(dpname)) {
      let gvlId = map.get("id");
      return gvlId;
    }
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

function generateOutputFile(dpUrlArray,fileName){
  try {
    //console.log('dpUrlArray---', dpUrlArray)
    const ws = XLSX.utils.json_to_sheet(dpUrlArray,{header:["code","displayName","gdpr","ccpa","schain","tcf2","BidParams","allUrls","mediaTypesDocVal","schainDocVal","schainUrlVal","gdprDocVal","gdprUrlVal","ccpaDocVal","ccpaUrlVal","tcf2UrlVal","gvlIdDocVal","gvlIdJsonVal",]}
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "PrebidDpDetails");
    XLSX.writeFile(wb, `./${fileName}`);
    console.log("Check PrebidDpDetails of file dp_list_test.xlsx ");
  } catch (err) {
    const message = err.message;
    const code = err.code;
   if(code ==="EBUSY"){
    console.log(`Please close the file ${fileName} and try again!`);
   } else {
    console.log("Please retry after resolution of error:", message);
    }
  }
}

module.exports = {
  chooseParamType: chooseParamType,
  stringToBoolean: stringToBoolean,
  getTcf2JsonVal: getTcf2JsonVal,
  getSchainGdprCcpaVal: getSchainGdprCcpaVal,
  getTcf2Val: getTcf2Val,
  getAllUrls: getAllUrls,
  generateOutputFile:generateOutputFile,
  paramRequire : paramRequire
};
