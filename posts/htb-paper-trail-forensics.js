BLOG_POSTS.push({
  title: "HTB Business CTF: Paper Trail, a Forensics Puzzle With Too Many PNGs",
  slug: "htb-paper-trail-forensics",
  date: "2026-09-14",
  updated: "",
  category: "htb-2026",
  tags: ["forensics", "python"],
  excerpt: "A pile of invoices, one suspicious byte pattern, and the RC4 key hiding in a printer's metadata.",
  difficulty: "HARD",
  flag: "HTB{paper_trail_has_teeth}",
  featured: false,
  body: `This challenge gave us a ZIP with 240 invoice PNGs and a single hint: *"the numbers add up, but not in the way you think."*

## First Pass: Look at the Files

~~~bash
file invoices/*.png | sort -u
exiftool invoices/*.png | grep -i -E 'comment|software|author'
~~~

Every file was a valid PNG with identical dimensions. Two of them had a non-empty \`Comment\` tag containing what looked like base64:

~~~text
Comment: QVBJX0tFWTpwcmludGVyXzIwMjQ=
~~~

Decoded: \`API_KEY:printer_2024\`. That turned out to be a decoy. It unlocked an S3-style endpoint that returned a 403 and a very sarcastic error message.

## Second Pass: The Bytes Between Chunks

PNG is chunk-based. Extra data can hide between valid chunks without breaking the image. I wrote a quick chunk walker:

~~~python
import struct
from pathlib import Path

def chunks(path):
    data = Path(path).read_bytes()
    pos = 8
    while pos < len(data):
        length = struct.unpack(">I", data[pos:pos + 4])[0]
        kind = data[pos + 4:pos + 8].decode("latin1")
        yield kind, data[pos + 8:pos + 8 + length]
        pos += 12 + length

for p in sorted(Path("invoices").glob("*.png")):
    kinds = [k for k, _ in chunks(p)]
    if any(k not in ("IHDR", "IDAT", "IEND", "sRGB", "pHYs") for k in kinds):
        print(p, kinds)
~~~

One file had a \`tEXt\` chunk with keyword \`TOTAL\` and a very long value: 4096 bytes of high-entropy data. That was the ciphertext.

## Third Pass: Find the Key

The trick was in the invoice numbers. Each filename was \`inv_XXXX.png\`. Sorting them by the numeric part and taking the low byte of each number spelled out a passphrase in ASCII.

~~~python
names = sorted(Path("invoices").glob("inv_*.png"),
               key=lambda p: int(p.stem.split("_")[1]))
key = bytes(int(p.stem.split("_")[1]) & 0xff for p in names)[:32]
print(key)
~~~

It produced \`RC4_is_not_dead_but_it_should_be\`. Many CTFs use RC4 because it is one line in Python:

~~~python
def rc4(key, data):
    S = list(range(256))
    j = 0
    for i in range(256):
        j = (j + S[i] + key[i % len(key)]) % 256
        S[i], S[j] = S[j], S[i]
    out, i, j = bytearray(), 0, 0
    for b in data:
        i = (i + 1) % 256
        j = (j + S[i]) % 256
        S[i], S[j] = S[j], S[i]
        out.append(b ^ S[(S[i] + S[j]) % 256])
    return bytes(out)
~~~

Decrypting the \`TOTAL\` chunk gave a JSON blob with the flag and a note: *"next time use AES-GCM, please."*

## What I Learned

- Decoys are usually obvious on purpose. If a hint feels too neat, it is.
- PNG chunk parsers are five lines of code and pay for themselves constantly.
- Filename order is data. I nearly missed it because I was sorting lexicographically.`
});
