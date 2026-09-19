import os, sys

files = [
    'smartcomm_fullyAI/dist/geo.js',
    'smartcomm_fullyAI/dist/planner.js',
    'smartcomm_fullyAI/dist/web.js'
]

for filepath in files:
    with open(filepath, 'r', encoding='utf-8') as f:
        src = f.read()
    
    stack = []
    i = 0
    n = len(src)
    in_single = False
    in_double = False
    in_template = False
    in_regex = False
    in_line_comment = False
    in_block_comment = False
    
    line = 1
    col = 1
    err = False
    last_non_space = ''
    
    while i < n:
        c = src[i]
        nxt = src[i+1] if i+1 < n else ''
        
        if c == '\n':
            line += 1
            col = 0
            if in_line_comment:
                in_line_comment = False
        
        if in_line_comment:
            i += 1
            col += 1
            continue
            
        if in_block_comment:
            if c == '*' and nxt == '/':
                in_block_comment = False
                i += 2
                col += 2
                continue
            i += 1
            col += 1
            continue
            
        if not in_single and not in_double and not in_template and not in_regex:
            if c == '/' and nxt == '/':
                in_line_comment = True
                i += 2
                col += 2
                continue
            if c == '/' and nxt == '*':
                in_block_comment = True
                i += 2
                col += 2
                continue
            if c == '/' and (last_non_space in '(=:,!&|?{;[\n' or last_non_space == ''):
                in_regex = True
                i += 1
                col += 1
                continue

        if in_regex:
            if c == '\\':
                i += 2
                col += 2
                continue
            if c == '/':
                in_regex = False
                i += 1
                col += 1
                continue
            i += 1
            col += 1
            continue

        if not in_single and not in_double:
            if c == '`':
                prev_char = src[i-1] if i > 0 else ''
                if prev_char != '\\':
                    in_template = not in_template
                i += 1
                col += 1
                continue
                
        if not in_template:
            if c == "'" and not in_double:
                prev_char = src[i-1] if i > 0 else ''
                if prev_char != '\\':
                    in_single = not in_single
                i += 1
                col += 1
                continue
            if c == '"' and not in_single:
                prev_char = src[i-1] if i > 0 else ''
                if prev_char != '\\':
                    in_double = not in_double
                i += 1
                col += 1
                continue
                
        if not in_single and not in_double and not in_template:
            if c in '({[':
                stack.append((c, line, col))
            elif c in ')}]':
                if not stack:
                    print(f'{filepath}: unexpected {c} at line {line}, col {col}')
                    err = True
                    break
                top, l, cl = stack.pop()
                expected = {'(': ')', '{': '}', '[': ']'}[top]
                if c != expected:
                    print(f'{filepath}: mismatched {c} (expected {expected} for {top} at line {l}, col {cl}) at line {line}, col {col}')
                    err = True
                    break
                    
        if not c.isspace():
            last_non_space = c
            
        i += 1
        col += 1
        
    if not err:
        if stack:
            print(f'{filepath}: unclosed: {stack[-5:]}')
        else:
            print(f'{filepath}: PASS - completely balanced syntax!')

