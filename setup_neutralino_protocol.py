import sys
import os
import winreg
import ctypes

def is_admin():
    try:
        return ctypes.windll.shell32.IsUserAnAdmin()
    except:
        return False

def register_protocol():
    # Attempt to locate the Neutralino binary
    # We assume this script is run from the project root
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Path to the build (Production)
    prod_exe = os.path.join(script_dir, "dist", "yt_dlp_gui", "yt_dlp_gui-win_x64.exe")
    
    # Path to dev runner (if prod not found, or for testing)
    # Actually, simpler to just ask or default to prod if exists, else warn.
    
    target_exe = ""
    command = ""
    
    if os.path.exists(prod_exe):
        target_exe = prod_exe
        # Neutralino executable automatically handles args
        command = f'"{target_exe}" "%1"'
    else:
        # Check for dev binary
        dev_exe = os.path.join(script_dir, "bin", "neutralino-win_x64.exe")
        if os.path.exists(dev_exe):
            target_exe = dev_exe
            # For dev, we need to point to resources. 
            # CAUTION: Passing args to dev binary might require specific sizing or --load-dir-res
            # Command: neutralino-win_x64.exe --load-dir-res --path=. -- %1
            # But standard is just passing args.
            command = f'"{target_exe}" --load-dir-res --path="{script_dir}" "%1"'
        else:
            print("Could not find yt_dlp_gui.exe in 'dist' nor 'neutralino-win_x64.exe' in 'bin'.")
            input("Press Enter to exit...")
            return

    protocol = "ytdlp"
    
    print(f"Registering protocol '{protocol}://' to: {target_exe}")
    print(f"Command: {command}")
    
    try:
        # HKCU\Software\Classes\ytdlp
        with winreg.CreateKey(winreg.HKEY_CURRENT_USER, f"Software\\Classes\\{protocol}") as key:
            winreg.SetValueEx(key, "", 0, winreg.REG_SZ, "URL:YT-DLP Protocol")
            winreg.SetValueEx(key, "URL Protocol", 0, winreg.REG_SZ, "")
            
            with winreg.CreateKey(key, "shell\\open\\command") as cmd_key:
                winreg.SetValueEx(cmd_key, "", 0, winreg.REG_SZ, command)
                
        print("Success! Protocol registered.")
    except Exception as e:
        print(f"Error: {e}")
        input("Press Enter to exit...")

if __name__ == "__main__":
    if not is_admin():
        # Usually HKCU doesn't need admin, but good to know
        pass
        
    register_protocol()
    import time
    time.sleep(2)
