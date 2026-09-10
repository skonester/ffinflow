import { app } from "electron";
import { execFile } from "child_process";
import path from "path";

const VIDEO_EXTENSIONS = [
    ".mp4", ".mkv", ".avi", ".webm", ".mov", ".flv",
    ".wmv", ".m4v", ".ts", ".3gp", ".mpg", ".mpeg",
    ".ogv", ".vob"
];

const AUDIO_EXTENSIONS = [
    ".mp3", ".wav", ".flac", ".aac", ".ogg",
    ".opus", ".m4a", ".wma"
];

export function getTargetExecutablePath(): string {
    if (app && app.isPackaged) {
        return app.getPath("exe");
    }
    const localBuilt = path.join(__dirname, "../../dist/win-unpacked/ffinflow.exe");
    try {
        const fs = require("fs");
        if (fs.existsSync(localBuilt)) {
            return localBuilt;
        }
    } catch {}
    return process.execPath;
}

export function setAsDefaultMediaPlayer(): Promise<boolean> {
    if (process.platform !== "win32") {
        return Promise.resolve(false);
    }

    const exePath = getTargetExecutablePath();
    const appExe = path.basename(exePath);

    const videoExtsList = VIDEO_EXTENSIONS.map(e => `"${e}"`).join(", ");
    const audioExtsList = AUDIO_EXTENSIONS.map(e => `"${e}"`).join(", ");

    const lines = [
        "$ErrorActionPreference = 'SilentlyContinue'",
        `$exePath = '${exePath.replace(/'/g, "''")}'`,
        `$appExe = '${appExe.replace(/'/g, "''")}'`,
        `$videoExts = @(${videoExtsList})`,
        `$audioExts = @(${audioExtsList})`,
        "$allExts = $videoExts + $audioExts",
        '$videoProgId = "ffinflow.Video"',
        '$audioProgId = "ffinflow.Audio"',
        'New-Item -Path "HKCU:\\Software\\Classes\\$videoProgId" -Force | Out-Null',
        'Set-ItemProperty -Path "HKCU:\\Software\\Classes\\$videoProgId" -Name "(Default)" -Value "ffinflow Video File"',
        'New-Item -Path "HKCU:\\Software\\Classes\\$videoProgId\\DefaultIcon" -Force | Out-Null',
        'Set-ItemProperty -Path "HKCU:\\Software\\Classes\\$videoProgId\\DefaultIcon" -Name "(Default)" -Value ("`"" + $exePath + "`",0")',
        'New-Item -Path "HKCU:\\Software\\Classes\\$videoProgId\\shell\\open\\command" -Force | Out-Null',
        'Set-ItemProperty -Path "HKCU:\\Software\\Classes\\$videoProgId\\shell\\open\\command" -Name "(Default)" -Value ("`"" + $exePath + "`" `"%1`"")',
        'New-Item -Path "HKCU:\\Software\\Classes\\$audioProgId" -Force | Out-Null',
        'Set-ItemProperty -Path "HKCU:\\Software\\Classes\\$audioProgId" -Name "(Default)" -Value "ffinflow Audio File"',
        'New-Item -Path "HKCU:\\Software\\Classes\\$audioProgId\\DefaultIcon" -Force | Out-Null',
        'Set-ItemProperty -Path "HKCU:\\Software\\Classes\\$audioProgId\\DefaultIcon" -Name "(Default)" -Value ("`"" + $exePath + "`",0")',
        'New-Item -Path "HKCU:\\Software\\Classes\\$audioProgId\\shell\\open\\command" -Force | Out-Null',
        'Set-ItemProperty -Path "HKCU:\\Software\\Classes\\$audioProgId\\shell\\open\\command" -Name "(Default)" -Value ("`"" + $exePath + "`" `"%1`"")',
        'New-Item -Path "HKCU:\\Software\\Classes\\Applications\\$appExe\\shell\\open\\command" -Force | Out-Null',
        'Set-ItemProperty -Path "HKCU:\\Software\\Classes\\Applications\\$appExe\\shell\\open\\command" -Name "(Default)" -Value ("`"" + $exePath + "`" `"%1`"")',
        'New-Item -Path "HKCU:\\Software\\Classes\\Applications\\$appExe\\SupportedTypes" -Force | Out-Null',
        'New-Item -Path "HKCU:\\Software\\ffinflow\\Capabilities\\FileAssociations" -Force | Out-Null',
        'Set-ItemProperty -Path "HKCU:\\Software\\ffinflow\\Capabilities" -Name "ApplicationName" -Value "ffinflow"',
        'Set-ItemProperty -Path "HKCU:\\Software\\ffinflow\\Capabilities" -Name "ApplicationDescription" -Value "ffinflow video and audio player"',
        'Set-ItemProperty -Path "HKCU:\\Software\\ffinflow\\Capabilities" -Name "ApplicationIcon" -Value ("`"" + $exePath + "`",0")',
        'Set-ItemProperty -Path "HKCU:\\Software\\RegisteredApplications" -Name "ffinflow" -Value "Software\\ffinflow\\Capabilities"',
        'foreach ($ext in $allExts) {',
        '    $progId = if ($ext -in $audioExts) { $audioProgId } else { $videoProgId }',
        '    Set-ItemProperty -Path "HKCU:\\Software\\Classes\\Applications\\$appExe\\SupportedTypes" -Name $ext -Value ""',
        '    Set-ItemProperty -Path "HKCU:\\Software\\ffinflow\\Capabilities\\FileAssociations" -Name $ext -Value $progId',
        '    New-Item -Path "HKCU:\\Software\\Classes\\$ext" -Force | Out-Null',
        '    Set-ItemProperty -Path "HKCU:\\Software\\Classes\\$ext" -Name "(Default)" -Value $progId',
        '    New-Item -Path "HKCU:\\Software\\Classes\\$ext\\OpenWithProgids" -Force | Out-Null',
        '    Set-ItemProperty -Path "HKCU:\\Software\\Classes\\$ext\\OpenWithProgids" -Name $progId -Value ""',
        '    New-Item -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\FileExts\\$ext\\OpenWithProgids" -Force | Out-Null',
        '    Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\FileExts\\$ext\\OpenWithProgids" -Name $progId -Value ([byte[]]@()) -Type Binary',
        '    New-Item -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\FileExts\\$ext\\OpenWithList" -Force | Out-Null',
        '    Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\FileExts\\$ext\\OpenWithList" -Name "a" -Value $appExe',
        '    Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\FileExts\\$ext\\OpenWithList" -Name "MRUList" -Value "a"',
        '    $ucPath = "Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\FileExts\\$ext\\UserChoice"',
        '    try {',
        '        $regKey = [Microsoft.Win32.Registry]::CurrentUser.OpenSubKey($ucPath, [Microsoft.Win32.RegistryKeyPermissionCheck]::ReadWriteSubTree, [System.Security.AccessControl.RegistryRights]::ChangePermissions)',
        '        if ($regKey) {',
        '            $acl = $regKey.GetAccessControl()',
        '            $denyRules = $acl.GetAccessRules($true, $false, [System.Security.Principal.NTAccount]) | Where-Object { $_.AccessControlType -eq [System.Security.AccessControl.AccessControlType]::Deny }',
        '            foreach ($rule in $denyRules) { $acl.RemoveAccessRule($rule) | Out-Null }',
        '            $regKey.SetAccessControl($acl)',
        '            $regKey.Close()',
        '            Remove-Item "HKCU:\\$ucPath" -Force -ErrorAction SilentlyContinue',
        '        }',
        '    } catch {}',
        '}',
        'try {',
        '    Add-Type -TypeDefinition \'using System; using System.Runtime.InteropServices; public class FfinflowNotify { [DllImport("shell32.dll")] public static extern void SHChangeNotify(int e, int f, IntPtr a, IntPtr b); }\' -ErrorAction SilentlyContinue',
        '    [FfinflowNotify]::SHChangeNotify(0x08000000, 0, [IntPtr]::Zero, [IntPtr]::Zero)',
        '} catch {}',
        'Write-Output "SUCCESS"'
    ];

    const script = lines.join("\r\n");

    return new Promise((resolve) => {
        const b64 = Buffer.from(script, "utf16le").toString("base64");
        execFile(
            "powershell.exe",
            ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-EncodedCommand", b64],
            { windowsHide: true },
            (error, stdout) => {
                if (error) {
                    console.error("Failed to set file associations:", error);
                    resolve(false);
                    return;
                }
                const output = (stdout || "").trim();
                resolve(output.includes("SUCCESS"));
            }
        );
    });
}