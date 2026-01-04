#!/usr/bin/env python3
import re
import sys

def convert_sql_placeholders(content):
    """Convert SQLite ? placeholders to PostgreSQL $1, $2, etc."""
    result = []
    lines = content.split('\n')

    for line in lines:
        # Skip if line doesn't contain SQL keywords
        if not re.search(r'\b(SELECT|INSERT|UPDATE|DELETE|WHERE|FROM|VALUES|SET|AND|OR|JOIN)\b', line, re.IGNORECASE):
            result.append(line)
            continue

        # Only process if inside a SQL string (backtick or quote)
        # Convert ? to $N in SQL context
        new_line = line

        # Find SQL query strings (between backticks)
        if '`' in line and '?' in line:
            # This is likely a SQL query
            param_count = 1
            output = ''
            in_string = False
            i = 0

            while i < len(line):
                char = line[i]

                if char == '`':
                    in_string = not in_string
                    output += char
                elif char == '?' and in_string:
                    # Check if this is in a ternary operator
                    # Look back and forward for : and check context
                    before = line[max(0, i-50):i].strip()
                    after = line[i+1:min(len(line), i+50)].strip()

                    # If we see a colon nearby and no SQL keywords between, it's likely ternary
                    is_ternary = False
                    if ':' in after[:20]:
                        # Check if there's no SQL between ? and :
                        between = after[:after.find(':')]
                        if not re.search(r'\b(SELECT|INSERT|UPDATE|DELETE|WHERE|FROM|VALUES)\b', between):
                            is_ternary = True

                    if not is_ternary:
                        output += f'${param_count}'
                        param_count += 1
                    else:
                        output += char
                else:
                    output += char

                i += 1

            new_line = output

        result.append(new_line)

    return '\n'.join(result)

def convert_boolean_syntax(content):
    """Convert = 1 / = 0 to = true / = false for booleans"""
    # Only in SQL context
    content = re.sub(r'=\s*1(?=\s*(?:AND|OR|\)|;|$))', '= true', content)
    content = re.sub(r'=\s*0(?=\s*(?:AND|OR|\)|;|$))', '= false', content)
    content = re.sub(r'\?\s*1\s*:\s*0', '? true : false', content)
    return content

def add_await_to_db_calls(content):
    """Add await before database calls if missing"""
    lines = content.split('\n')
    result = []

    for line in lines:
        new_line = line
        # Check if line has getOne, getAll, runQuery without await
        if re.search(r'^\s*(const|let|var)?\s*\w+\s*=\s*(getOne|getAll|runQuery)\(', line):
            if 'await' not in line:
                # Add await before the call
                new_line = re.sub(r'(\s*)(const|let|var)(\s+\w+\s*=\s*)(getOne|getAll|runQuery)',
                                r'\1\2\3await \4', line)
        elif re.search(r'^\s*(getOne|getAll|runQuery)\(', line):
            if 'await' not in line:
                new_line = re.sub(r'(\s*)(getOne|getAll|runQuery)', r'\1await \2', line)

        result.append(new_line)

    return '\n'.join(result)

def make_functions_async(content):
    """Make functions async if they use await"""
    if 'await' in content and 'async' not in content:
        # Add async to function declarations
        content = re.sub(r'\bexport\s+const\s+(\w+)\s*=\s*\(([^)]*)\):\s*(void|Response)\s*=>',
                        r'export const \1 = async (\2): Promise<\3> =>', content)
        content = re.sub(r'\bexport\s+function\s+(\w+)\s*\(([^)]*)\):\s*(void)',
                        r'export async function \1(\2): Promise<\3>', content)
    return content

if __name__ == '__main__':
    if len(sys.argv) != 2:
        print("Usage: python fix-sql.py <file>")
        sys.exit(1)

    filename = sys.argv[1]

    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()

    # Apply conversions
    content = convert_sql_placeholders(content)
    content = convert_boolean_syntax(content)
    content = add_await_to_db_calls(content)
    content = make_functions_async(content)

    with open(filename, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"✓ Converted {filename}")
