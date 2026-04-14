export const TRANSFORMATIONS = {
    STRING: [
        "DIRECT_COPY",
        "TRIM",
        "UPPER",
        "LOWER",
        "TRUNCATE",
        "CONCAT",
        "DEFAULT_VALUE",
        "REPLACE",
        "REGEX_EXTRACT",
    ],

    CONDITIONAL: ["IF_ELSE", "SWITCH_CASE", "COALESCE", "NULL_CHECK"],

    MATH: ["ADD", "SUBTRACT", "MULTIPLY", "DIVIDE", "ROUND", "EXPRESSION"],

    NUMBER_FORMATTING: [
        "FORMAT_NUMBER",
        "FORMAT_CURRENCY",
        "FORMAT_PERCENT",
        "FORMAT_COMPACT",
        "FORMAT_SCIENTIFIC",
    ],

    DATE: ["DATE_FORMAT", "DATE_ADD", "DATE_NOW", "DATE_DIFF", "DATE_TRUNCATE"],
};
