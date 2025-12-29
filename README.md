# logisim-viewer README

# Logisim Viewer for VS Code

An open-source VS Code extension that allows you to preview Logisim (`.circ`) circuit files directly within the editor using HTML5 Canvas. No need to open the Logisim Java application just to check a schematic!

## Features

* **Authentic Rendering:** Replicates the look and feel of the original Logisim interface.
* **Component Support:** * Logic Gates (AND, OR, NOT, XOR, NOR, NAND) with proper rotation.
  * Input/Output Pins (Square/Round) with bit width display.
  * Multiplexers (Trapezoid shape) and Splitters.
  * Arithmetic Units (Adder, Subtractor).
  * Input/Output Devices (LEDs, Hex Digit Displays, Buttons).
  * Constants and Wiring.
* **Instant Preview:** Double-click any `.circ` file to open it.

## Installation

1. Download the `.vsix` file from the [GitHub Releases](https://github.com/KULLANICI_ADIN/logisim-viewer/releases) page.
2. Open VS Code.
3. Go to Extensions -> `...` (Three dots at top right) -> **Install from VSIX...**
4. Select the downloaded file.

---

# VS Code için Logisim Görüntüleyici

Logisim (`.circ`) devre dosyalarını, Logisim uygulamasını açmaya gerek kalmadan doğrudan VS Code içinde görüntülemenizi sağlayan açık kaynaklı bir eklenti.

## Özellikler

* **Birebir Görünüm:** Orijinal Logisim arayüzüne sadık kalarak çizim yapar.
* **Desteklenen Bileşenler:**
  * Mantık Kapıları (AND, OR, NOT, XOR, NOR, NAND) ve döndürme desteği.
  * Giriş/Çıkış Pinleri (Kare/Yuvarlak) ve bit genişliği gösterimi.
  * Multiplexer (Yamuk şekli) ve Splitter (Ayırıcılar).
  * Aritmetik Birimler (Toplayıcı, Çıkarıcı).
  * Giriş/Çıkış Cihazları (LED'ler, 7 Segment Ekranlar).
  * Sabitler ve Kablolama.
* **Hızlı Önizleme:** Herhangi bir `.circ` dosyasına çift tıklayarak anında görüntüleyin.

## Kurulum

1. [GitHub Releases](https://github.com/KULLANICI_ADIN/logisim-viewer/releases) sayfasından `.vsix` dosyasını indirin.
2. VS Code'u açın.
3. Eklentiler sekmesi -> `...` (Sağ üstteki üç nokta) -> **VSIX dosyasından yükle...** seçeneğini seçin.
4. İndirdiğiniz dosyayı seçin.

---

**Developed by:** Özhan Gebeşoğlu
**License:** MIT

This is the README for your extension "logisim-viewer". After writing up a brief description, we recommend including the following sections.

## Features

Describe specific features of your extension including screenshots of your extension in action. Image paths are relative to this README file.

For example if there is an image subfolder under your extension project workspace:

\!\[feature X\]\(images/feature-x.png\)

> Tip: Many popular extensions utilize animations. This is an excellent way to show off your extension! We recommend short, focused animations that are easy to follow.

## Requirements

If you have any requirements or dependencies, add a section describing those and how to install and configure them.

## Extension Settings

Include if your extension adds any VS Code settings through the `contributes.configuration` extension point.

For example:

This extension contributes the following settings:

* `myExtension.enable`: Enable/disable this extension.
* `myExtension.thing`: Set to `blah` to do something.

## Known Issues

Calling out known issues can help limit users opening duplicate issues against your extension.

## Release Notes

Users appreciate release notes as you update your extension.

### 1.0.0

Initial release of ...

### 1.0.1

Fixed issue #.

### 1.1.0

Added features X, Y, and Z.

---

## Following extension guidelines

Ensure that you've read through the extensions guidelines and follow the best practices for creating your extension.

* [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)

## Working with Markdown

You can author your README using Visual Studio Code. Here are some useful editor keyboard shortcuts:

* Split the editor (`Cmd+\` on macOS or `Ctrl+\` on Windows and Linux).
* Toggle preview (`Shift+Cmd+V` on macOS or `Shift+Ctrl+V` on Windows and Linux).
* Press `Ctrl+Space` (Windows, Linux, macOS) to see a list of Markdown snippets.

## For more information

* [Visual Studio Code's Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
* [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/)

**Enjoy!**
