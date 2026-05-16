import os
import sys
import traceback
from dotenv import load_dotenv
from github import Github
from src.gen_readme import generate_fetch, generate_readme, gen_image

def main():
    try:
        load_dotenv()
        token = os.getenv("GH_STATS_TOKEN")
        if not token:
            raise ValueError("GH_STATS_TOKEN environment variable not set")

        script_dir = os.path.dirname(os.path.abspath(__file__))
        os.chdir(script_dir)

        g = Github(token)
        readme_path = os.path.join(script_dir, "..", "README.md")
        out_dir = os.path.join(script_dir, "..", "out")
        os.makedirs(out_dir, exist_ok=True)
        generate_readme(g, readme_path, out_dir)
        print(" README updated successfully!")
        return 0

    except Exception as e:
        print(f" {e}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        return 1

if __name__ == "__main__":
    sys.exit(main())
