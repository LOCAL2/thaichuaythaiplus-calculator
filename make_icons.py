import struct, zlib

def make_png(size, bg_rgb, fg_rgb):
    w = h = size
    br, bg_c, bb = bg_rgb
    fr, fg_c, fb = fg_rgb

    raw_rows = []
    for y in range(h):
        row = [0]  # filter byte
        for x in range(w):
            cx = x - w / 2.0
            cy = y - h / 2.0
            dist = (cx*cx + cy*cy) ** 0.5
            radius = w * 0.44

            if dist <= radius:
                in_vert = abs(cx) <= w * 0.065
                in_top  = abs(cy + h * 0.09) <= h * 0.065
                in_bot  = abs(cy - h * 0.09) <= h * 0.065
                if in_vert or in_top or in_bot:
                    row += [fr, fg_c, fb, 255]
                else:
                    row += [br, bg_c, bb, 255]
            else:
                row += [0, 0, 0, 0]
        raw_rows.append(bytes(row))

    raw = b''.join(raw_rows)
    compressed = zlib.compress(raw, 9)

    def chunk(tag, data):
        crc = zlib.crc32(tag + data) & 0xFFFFFFFF
        return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', crc)

    ihdr = struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0)
    png  = b'\x89PNG\r\n\x1a\n'
    png += chunk(b'IHDR', ihdr)
    png += chunk(b'IDAT', compressed)
    png += chunk(b'IEND', b'')
    return png

teal  = (13, 148, 136)
white = (255, 255, 255)

for size in [192, 512]:
    data = make_png(size, teal, white)
    path = f'public/icon-{size}.png'
    with open(path, 'wb') as f:
        f.write(data)
    with open(path, 'rb') as f:
        header = f.read(8)
    ok = header == b'\x89PNG\r\n\x1a\n'
    print(f'icon-{size}.png  {len(data)} bytes  valid={ok}')
