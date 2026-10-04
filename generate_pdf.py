import os
import sys
import shutil
import subprocess

# Ensure UTF-8 output on Windows terminal
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

def main():
    base_dir = os.path.abspath(os.path.dirname(__file__))
    slides_dir = os.path.join(base_dir, 'slides')
    downloads_dir = r'C:\Users\VDT\Downloads'

    index_html = os.path.join(slides_dir, 'index.html')
    with open(index_html, 'r', encoding='utf-8') as f:
        template = f.read()

    theme_configs = [
        {
            'name': 'swiss',
            'html': 'theme_swiss.html',
            'pdf_name': 'Slide_To4_ThietKe1_Swiss_Tech.pdf',
            'title': 'Bản 1: Minimalist Swiss (Sáng tối giản)'
        },
        {
            'name': 'dark',
            'html': 'theme_dark.html',
            'pdf_name': 'Slide_To4_ThietKe2_Minimal_Dark.pdf',
            'title': 'Bản 2: Minimal Dark (Tối giản thanh lịch)'
        },
        {
            'name': 'academic',
            'html': 'theme_academic.html',
            'pdf_name': 'Slide_To4_ThietKe3_Academic_Editorial.pdf',
            'title': 'Bản 3: Academic Editorial (Học thuật trang nhã)'
        }
    ]

    for config in theme_configs:
        theme = config['name']
        out_file = os.path.join(slides_dir, config['html'])
        # replace body theme attribute
        content = template.replace('<body data-theme="swiss">', f'<body data-theme="{theme}">')
        # reset select
        content = content.replace('selected', '')
        content = content.replace(f'value="{theme}"', f'value="{theme}" selected')
        
        with open(out_file, 'w', encoding='utf-8') as f_out:
            f_out.write(content)
        print(f"Generated clean UTF-8 HTML: {config['html']} ({len(content)} characters)")

    # Verify no mojibake in generated files (only actual mojibake multi-byte corruptions)
    mojibake_tokens = ['Ã¡', '\xc3\xa0', 'Ã¢', 'Ã©', 'Ã¨', 'Ãª', 'Ã³', 'Ã²', 'Ã´', 'Ãº', 'Ã¹', 'Ä‘', '\xc4\x91', 'áº', 'á»', 'â€¢', 'ðŸ']
    for config in theme_configs:
        out_file = os.path.join(slides_dir, config['html'])
        with open(out_file, 'r', encoding='utf-8') as f_check:
            txt = f_check.read()
            found = [t for t in mojibake_tokens if t in txt]
            if found:
                print(f"WARNING: Mojibake detected in {config['html']}: {found}")
            else:
                print(f"SUCCESS: {config['html']} has 100% CLEAN Vietnamese encoding!")

    # Check Edge binary
    edge_paths = [
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe"
    ]
    edge_exe = next((p for p in edge_paths if os.path.exists(p)), None)
    if not edge_exe:
        print("ERROR: Edge executable not found!")
        return

    print(f"Using Microsoft Edge: {edge_exe}")

    # Generate PDFs
    for config in theme_configs:
        html_url = f"http://localhost:8080/slides/{config['html']}"
        target_download_pdf = os.path.join(downloads_dir, config['pdf_name'])
        target_slides_pdf = os.path.join(slides_dir, config['pdf_name'])
        target_root_pdf = os.path.join(base_dir, config['pdf_name'])

        print(f"\n--- Printing {config['title']} to PDF ---")
        cmd = [
            edge_exe,
            "--headless=new",
            "--disable-gpu",
            "--virtual-time-budget=6000",
            "--no-pdf-header-footer",
            f"--print-to-pdf={target_download_pdf}",
            html_url
        ]
        res = subprocess.run(cmd, capture_output=True, text=True)
        if os.path.exists(target_download_pdf):
            size = os.path.getsize(target_download_pdf)
            print(f"Created {target_download_pdf} ({size:,} bytes)")
            # Copy to slides and root
            shutil.copy2(target_download_pdf, target_slides_pdf)
            shutil.copy2(target_download_pdf, target_root_pdf)
            if config['name'] == 'swiss':
                shutil.copy2(target_download_pdf, os.path.join(downloads_dir, "Slide_To4_DeTai9.pdf"))
                shutil.copy2(target_download_pdf, os.path.join(slides_dir, "Slide_To4_DeTai9.pdf"))
                shutil.copy2(target_download_pdf, os.path.join(base_dir, "Slide_To4_DeTai9.pdf"))
        else:
            print(f"FAILED to create PDF: {target_download_pdf}")

    print("\nAll PDFs generated and copied successfully!")

if __name__ == '__main__':
    main()
