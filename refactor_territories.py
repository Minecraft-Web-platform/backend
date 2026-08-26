import os

with open('src/states/states.service.ts', 'r') as f:
    lines = f.readlines()

def extract_method(start_str):
    start_idx = -1
    for i, line in enumerate(lines):
        if start_str in line:
            start_idx = i
            break
            
    if start_idx == -1:
        return ""
        
    brace_count = 0
    end_idx = -1
    for i in range(start_idx, len(lines)):
        brace_count += lines[i].count('{')
        brace_count -= lines[i].count('}')
        if brace_count == 0 and '{' in ''.join(lines[start_idx:i+1]):
            end_idx = i
            break
            
    if end_idx != -1:
        extracted = "".join(lines[start_idx:end_idx+1])
        # delete from lines
        del lines[start_idx:end_idx+1]
        return extracted
    return ""

m1 = extract_method("public invalidateBlueMapCache()")
m2 = extract_method("public async addCityTerritory(")
m3 = extract_method("public async getAllTerritories()")
m4 = extract_method("public async getBlueMapMarkers(")

with open('src/states/states.service.ts', 'w') as f:
    f.writelines(lines)
    
with open('extracted_territories.txt', 'w') as f:
    f.write(m1 + "\n" + m2 + "\n" + m3 + "\n" + m4 + "\n")

