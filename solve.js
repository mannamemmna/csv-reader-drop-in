// A faster drop-in for csv-reader 1.0.0: run(input) returns the same {columns, rows, errors} as its readCsv.
// The policy is csv-reader's own; only the walk changes: ordinary runs are taken as one slice instead of a
// character at a time.

const T_COMMA = 1;
const T_BREAK = 2;
const T_END = 3;

const CH_QUOTE = 34;
const CH_COMMA = 44;
const CH_LF = 10;
const CH_CR = 13;

export function run(input) {
  const text = String(input.text);
  const header = input.header === true;
  const len = text.length;
  const errors = [];
  const rows = [];
  let columns = null;
  let width = -1;

  let pos = 0;
  let line = 1;
  if (len > 0 && text.charCodeAt(0) === 0xfeff) pos = 1;

  let recordLine = 1;
  let recordRow = null;
  let fields = null;
  let lastQuoted = false;

  for (;;) {
    // A line left with no characters is no record.
    while (pos < len) {
      const c = text.charCodeAt(pos);
      if (c === CH_LF) {
        pos += 1;
        line += 1;
      } else if (c === CH_CR && text.charCodeAt(pos + 1) === CH_LF) {
        pos += 2;
        line += 1;
      } else break;
    }
    if (pos >= len) break;

    recordLine = line;
    recordRow = header && columns === null ? null : rows.length;
    fields = [];

    for (;;) {
      // ---- one field ----
      let value = '';
      let start = pos;
      let fresh = true;
      let junk = false;
      let added = 0;
      let terminated = 0;
      let quoted = false;

      if (text.charCodeAt(pos) === CH_QUOTE) {
        quoted = true;
        const body = pos + 1;
        const openLine = line;
        // The body runs to the next quote that is not doubled.
        let v = '';
        let seg = body;
        let i = body;
        let q = -1;
        while (i < len) {
          const c = text.charCodeAt(i);
          if (c === CH_QUOTE) {
            if (text.charCodeAt(i + 1) === CH_QUOTE) {
              // "" inside it is one quote.
              v += text.slice(seg, i) + '"';
              i += 2;
              seg = i;
              continue;
            }
            v += text.slice(seg, i);
            q = i;
            break;
          }
          if (c === CH_LF) {
            line += 1;
            i += 1;
            continue;
          }
          if (c === CH_CR) {
            // Each CRLF or lone CR inside the quotes is read as one LF.
            v += text.slice(seg, i) + '\n';
            line += 1;
            i += text.charCodeAt(i + 1) === CH_LF ? 2 : 1;
            seg = i;
            continue;
          }
          i += 1;
        }
        if (q < 0) {
          // The quote never closes: it is a literal character, and the text after it is read again as unquoted.
          pos = body;
          line = openLine;
          start = body;
          fresh = false;
          value = '"';
          errors.push({ code: 'unterminated_quote', line: recordLine, row: recordRow });
        } else {
          value = seg === body ? v : v;
          pos = q + 1;
          if (pos >= len) {
            terminated = T_END;
          } else {
            const c = text.charCodeAt(pos);
            if (c === CH_COMMA) {
              pos += 1;
              terminated = T_COMMA;
            } else if (c === CH_LF) {
              pos += 1;
              line += 1;
              terminated = T_BREAK;
            } else if (c === CH_CR && text.charCodeAt(pos + 1) === CH_LF) {
              pos += 2;
              line += 1;
              terminated = T_BREAK;
            } else {
              // What follows the closing quote is appended as it stands.
              start = pos;
              fresh = false;
              junk = true;
            }
          }
        }
      }

      if (terminated === 0) {
        // ---- unquoted characters, appended to value, up to the next comma or line break ----
        let scanning = true;
        while (scanning) {
          scanning = false;
          let i = start;
          let c = 0;
          while (i < len) {
            c = text.charCodeAt(i);
            if (c === CH_COMMA || c === CH_LF || c === CH_CR) break;
            i += 1;
          }
          if (i >= len) {
            value = fresh ? text.slice(start, len) : value + text.slice(start, len);
            added += len - start;
            pos = len;
            terminated = T_END;
            break;
          }
          if (c === CH_COMMA) {
            value = fresh ? text.slice(start, i) : value + text.slice(start, i);
            added += i - start;
            pos = i + 1;
            terminated = T_COMMA;
            break;
          }
          if (c === CH_LF) {
            value = fresh ? text.slice(start, i) : value + text.slice(start, i);
            added += i - start;
            pos = i + 1;
            line += 1;
            terminated = T_BREAK;
            break;
          }
          // CR: a CRLF ends the record, a lone CR is dropped.
          value = fresh ? text.slice(start, i) : value + text.slice(start, i);
          added += i - start;
          if (text.charCodeAt(i + 1) === CH_LF) {
            pos = i + 2;
            line += 1;
            terminated = T_BREAK;
            break;
          }
          errors.push({ code: 'stray_cr', line: recordLine, row: recordRow });
          pos = i + 1;
          start = pos;
          fresh = false;
          scanning = true;
        }
      }

      if (junk && added > 0) errors.push({ code: 'quote_junk', line: recordLine, row: recordRow });

      lastQuoted = quoted;
      fields.push(value);
      if (terminated !== T_COMMA) break;
    }

    // A line that held only stray CRs is left with no characters: no record (its stray_cr errors stay).
    if (fields.length === 1 && fields[0] === '' && !lastQuoted) continue;

    const n = fields.length;
    if (width < 0) width = n;
    if (header && columns === null) {
      columns = fields;
      continue;
    }
    if (n < width) {
      errors.push({ code: 'short_row', line: recordLine, row: recordRow, fields: n });
      while (fields.length < width) fields.push('');
    } else if (n > width) {
      errors.push({ code: 'long_row', line: recordLine, row: recordRow, extra: fields.splice(width) });
    }
    rows.push(fields);
  }

  return { columns: header ? (columns ?? []) : null, rows, errors };
}
