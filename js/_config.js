// use "pretty-print": true and "mode": "WHITESPACE" for debugging
{
	"id": "othello",
	"paths": ".",
	"pretty-print": false,
	"mode": "ADVANCED",
	"level": "VERBOSE",
	"modules": {
		"trix": {
			"inputs": ["header.js", "client.js"],
			"deps": []
		}
	},
	"module-output-path": "compiled/%s.js",
	"treat-warnings-as-errors": true,
	"checks": {
		"accessControls": "ERROR",
		"visibility": "ERROR",
		"checkRegExp": "ERROR",
		"checkTypes": "ERROR",
		"checkVars": "ERROR",
		"deprecated": "ERROR",
		"fileoverviewTags": "ERROR",
		"invalidCasts": "ERROR",
		"missingProperties": "ERROR",
		"nonStandardJsDocs": "ERROR",
		"undefinedVars": "ERROR",
		"unknownDefines": "ERROR"
	}
}
