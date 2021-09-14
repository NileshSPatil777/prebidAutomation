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

function getSchainGdprCcpaVal(docVal, urlVal) {
  if (docVal == urlVal)
    return urlVal;
  else
    return "Recheck";
}

function getTcf2JsonVal(dpname,allReqUrlResult) {
  for (const vendor of Object.values(allReqUrlResult.tcf2JsonGvl.vendors)) {
    const map = new Map(Object.entries(vendor));
    if (map.get("name").includes(dpname)) {
      GVLid = map.get("id");
      // console.log(GVLid);
      return GVLid;
    }
  }
}

module.exports = {
  chooseParamType: chooseParamType,
  stringToBoolean: stringToBoolean,
  getTcf2JsonVal: getTcf2JsonVal,
  getSchainGdprCcpaVal: getSchainGdprCcpaVal
};
