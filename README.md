# Hack The Box Discord Presence (Firefox + Kali Linux)

Extension นี้จะอ่าน activity จากหน้า Hack The Box ใน Firefox แล้วส่งไป Native Messaging host (Python) เพื่ออัปเดต Discord Rich Presence บน Linux.

## โครงสร้าง

- `extension/` : Firefox WebExtension
- `native-host/` : Python Native Messaging host
- `install_native_host.sh` : สคริปต์ติดตั้ง host บน Kali

## สิ่งที่ต้องมี

- Kali Linux
- Firefox
- Discord Desktop (แนะนำติดตั้งแบบ native package)
- Python 3 + venv

ติดตั้ง dependency ระบบ:

```bash
sudo apt update
sudo apt install -y python3 python3-venv
```

## 1) ติดตั้ง Native Host

จาก root โฟลเดอร์โปรเจกต์:

```bash
chmod +x install_native_host.sh native-host/launch_host.sh native-host/htb_discord_host.py
./install_native_host.sh htb-presence@local
```

สคริปต์จะทำ:

- สร้าง venv ที่ `native-host/.venv`
- ติดตั้ง `pypresence`
- เขียน manifest ไปที่ `~/.mozilla/native-messaging-hosts/com.htb.discord.presence.json`

## 2) โหลด Extension ใน Firefox

1. เปิด `about:debugging#/runtime/this-firefox`
2. กด `Load Temporary Add-on...`
3. เลือกไฟล์ `extension/manifest.json`

## 3) ตั้งค่า Discord App

1. เปิดหน้า Options ของ extension
2. ใส่ `Discord Application Client ID`
3. (ถ้ามี) ใส่ `Large Image Key` ที่คุณสร้างไว้ใน Discord Developer Portal
4. Save

## 4) ใช้งาน

- เปิด Discord desktop ให้ล็อกอิน
- เข้าใช้งาน Hack The Box ที่ `https://app.hackthebox.com/`
- Presence จะอัปเดตตาม route เช่น Machines / Challenges / Academy

## หมายเหตุสำคัญ

- ถ้าใช้ Discord แบบ Flatpak อาจไม่เห็น IPC socket ตามปกติ
- ถ้า route ของ HTB เปลี่ยน โค้ดใน `extension/content.js` อาจต้องเพิ่ม mapping
- ตอนนี้ extension ส่งสถานะจาก URL/title (ไม่ใช้ HTB private API token)

## ไฟล์หลัก

- `extension/manifest.json`
- `extension/background.js`
- `extension/content.js`
- `extension/options.html`
- `native-host/htb_discord_host.py`
- `install_native_host.sh`
