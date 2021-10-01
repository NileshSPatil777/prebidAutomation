/*
  This script is intended to be run locally to generate SQL that can then be
  run on any environment.
*/

function getInputDpArray(input, callback){

const fs = require("fs");
const generateNanoId = require("nanoid/generate");
const alphabet =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

const sqlInputData = input;

const NULL = "NULL";
// Change these variables if you need to
const MAX_VERSION = NULL;
const MIN_VERSION = "6.0.0";

const wrapInParens = v => `(${v})`;
const wrapInQuotes = v => `"${v}"`;
const nullOrWrapInQuotes = v =>
  String(v).toUpperCase() === NULL || v === null ? NULL : wrapInQuotes(v);

const createDemandPartnerObject = ({
  displayName,
  code,
  gdpr = false,
  ccpa = false,
  tcf2 = false,
  maxVersion = MAX_VERSION,
  minVersion = MIN_VERSION,
  type = 1,
}) => ({
  code: wrapInQuotes(code),
  createdAt: "NOW()",
  updatedAt: "NOW()",
  displayName: wrapInQuotes(displayName),
  gdpr,
  ccpa,
  tcf2,
  guid: wrapInQuotes(generateNanoId(alphabet, 4)), // 4 is length of guid
  logo: wrapInQuotes(`${code}.png`),
  maxVersion: nullOrWrapInQuotes(maxVersion),
  minVersion: nullOrWrapInQuotes(minVersion),
  type,
});

const createParamObject = ({
  demandPartnerCode,
  maxVersion = MAX_VERSION,
  minVersion = MIN_VERSION,
  paramName,
  paramType,
  required = false,
  subType = NULL,
}) => ({
  createdAt: "NOW()",
  updatedAt: "NOW()",
  maxVersion: nullOrWrapInQuotes(maxVersion),
  minVersion: nullOrWrapInQuotes(minVersion),
  paramName: wrapInQuotes(paramName),
  paramType: wrapInQuotes(paramType),
  partner: wrapInParens(
    `SELECT id FROM demandpartner WHERE code = "${demandPartnerCode}"`
  ),
  required,
  subType: nullOrWrapInQuotes(subType),
});

const createPermissionObject = ({ code, displayName }) => ({
  createdAt: "NOW()",
  updatedAt: "NOW()",
  description: wrapInQuotes(`Permits user to use ${displayName} Adapter`),
  displayName: wrapInQuotes(`Include ${displayName} Adapter`),
  slug: wrapInQuotes(`include-adapter--${code}`),
});

const createRoleObject = demandPartner => ({
  permission_roles: wrapInParens(
    `SELECT id FROM permission WHERE slug = ${
      createPermissionObject(demandPartner).slug
    }`
  ),
  role_permissions: wrapInParens(`SELECT @defaultAdaptersRoleID`),
});

const createValuesField = (objectCreator, data) => {
  // Object.values should return the values in order of definition.
  // https://stackoverflow.com/questions/41761732/do-object-keys-and-object-values-methods-return-arrays-that-preserve-the-sam
  // https://2ality.com/2015/10/property-traversal-order-es6.html#traversing-the-own-keys-of-an-object
  const insertValues = Object.values(objectCreator(data));
  return `(${insertValues.join(", ")})`;
};

const createDemandPartnerInsert = demandPartnerData =>
  createValuesField(createDemandPartnerObject, demandPartnerData);

const createParamInsert = (demandPartnerCode, paramData) =>
  createValuesField(createParamObject, { demandPartnerCode, ...paramData });

const createPermissionInsert = demandPartnerData =>
  createValuesField(createPermissionObject, demandPartnerData);

const createRoleInsert = demandPartner =>
  createValuesField(createRoleObject, demandPartner);

const { demandPartners, params, permissions, roles } = sqlInputData.reduce(
  (acc, demandPartner) => {
    acc.demandPartners.push(createDemandPartnerInsert(demandPartner));

    demandPartner.params &&
      demandPartner.params.forEach(param =>
        acc.params.push(createParamInsert(demandPartner.code, param))
      );

    acc.permissions.push(createPermissionInsert(demandPartner));

    acc.roles.push(createRoleInsert(demandPartner));
    return acc;
  },
  {
    demandPartners: [],
    params: [],
    permissions: [],
    roles: [],
  }
);

/* Generated SQL */

const joinInsertValues = v => v.join(",\n\t");

const setVariablesSQL = `SELECT id INTO @defaultAdaptersRoleID FROM role WHERE slug = "include-adapters--default";
`;

const demandPartnerSQL = `
INSERT INTO demandpartner (
  code,
  createdAt,
  updatedAt,
  displayName,
  gdpr,
  ccpa,
  tcf2,
  guid,
  logo,
  maxVersion,
  minVersion,
  type
) VALUES
\t${joinInsertValues(demandPartners)};
`;

const paramSQL = `
INSERT INTO param (
  createdAt,
  updatedAt,
  maxVersion,
  minVersion,
  paramName,
  paramType,
  partner,
  required,
  subType
) VALUES
\t${joinInsertValues(params)};
`;

const permissionSQL = `
INSERT INTO permission (
  createdAt,
  updatedAt,
  description,
  displayName,
  slug
) VALUES
\t${joinInsertValues(permissions)};
`;

const roleSQL = `
INSERT INTO permission_roles__role_permissions (
  permission_roles,
  role_permissions
) VALUES
\t${joinInsertValues(roles)};
`;

const sql = [
  "START TRANSACTION;\n\n",
  "-- variables\n",
  setVariablesSQL,
  demandPartnerSQL,
  paramSQL,
  permissionSQL,
  roleSQL,
  "\nCOMMIT;",
].join("");

const outputFile = __dirname + "/generatedSQL.sql";
fs.writeFileSync(outputFile, sql);
console.log(`Successfully wrote SQL to ${outputFile}`);
callback(null)
}

module.exports ={
  getInputDpArray : getInputDpArray
}