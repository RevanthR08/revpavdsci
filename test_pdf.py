import json
import os
import subprocess
import sys

payload = {
    "scan_id": "test_scan",
    "analysis": {
        "scan_id": "test_scan",
        "file_name": "test_logs.json"
    },
    "findings": [
        {"severity": "critical", "title": "Test Finding", "detection_type": "rule"}
    ],
    "summary": {
        "content_markdown": "# Test Summary\nThis is a test summary for PDF generation."
    }
}

input_path = "test_input.json"
output_path = "test_output.pdf"

with open(input_path, "w") as f:
    json.dump(payload, f)

script_path = os.path.join(os.getcwd(), "frontend", "reporting", "generate_forensic_report.py")

print(f"Running: python {script_path} --input {input_path} --output {output_path}")
result = subprocess.run([sys.executable, script_path, "--input", input_path, "--output", output_path], capture_output=True, text=True)

print("STDOUT:", result.stdout)
print("STDERR:", result.stderr)

if result.returncode == 0:
    print("SUCCESS: PDF generated.")
else:
    print(f"FAILURE: Code {result.returncode}")
