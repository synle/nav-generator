// https://foo123.github.io/examples/codemirror-grammar/
// a partial javascript grammar in simple JSON format
{
    // prefix ID for regular expressions used in the grammar
    "RegExpID": "RE::",
    // Style model
    "Style": {
        "keyword": "keyword",
        "header": "header",
        "title": "title",
        "icon": "icon"
    },
    // Lexical model
    "Lex": {
        "operator2": {
            "tokens": ["|", "|||", "javascript:", "data:text/html,"]
        },
        "keyword": {
            // "tokens": ["```", "#", "!", "@"],
            "tokens": ["```"]
        },
        "header": "RE::/[#][ ]*[A-Za-z0-9 /,:]+/",
        "title": "RE::/[!][ ]*[A-Za-z0-9 /,:]+/",
        "icon": "RE::/[@][ ]*[A-Za-z0-9 /,:]+/"
    },
    // Syntax model (optional)
    "Syntax": {
        "js": "keyword | operator2 | header | title | icon"
    },
    // what to parse and in what order
    "Parser": [
        ["js"]
    ]
}
