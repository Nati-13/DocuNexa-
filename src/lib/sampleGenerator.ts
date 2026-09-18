import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

/**
 * Creates an authentic sample multi-unit educational textbook PDF
 * with Front Matter, Table of Contents, and 3 Units.
 */
export async function createSampleTextbookPdf(): Promise<File> {
  const pdfDoc = await PDFDocument.create();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  // Page 1: Cover Page
  {
    const page = pdfDoc.addPage([600, 800]);
    page.drawText('BIOLOGY GRADE 10', {
      x: 60,
      y: 650,
      size: 32,
      font: fontBold,
      color: rgb(0.15, 0.2, 0.5),
    });
    page.drawText('Principles of Life & Modern Ecology', {
      x: 60,
      y: 600,
      size: 18,
      font: fontRegular,
      color: rgb(0.3, 0.3, 0.4),
    });
    page.drawText('Student Textbook • 2026 Edition', {
      x: 60,
      y: 560,
      size: 14,
      font: fontItalic,
      color: rgb(0.4, 0.4, 0.5),
    });
    page.drawText('Educational Materials Publishing Foundation', {
      x: 60,
      y: 80,
      size: 11,
      font: fontRegular,
      color: rgb(0.5, 0.5, 0.5),
    });
  }

  // Page 2: Copyright & Preface
  {
    const page = pdfDoc.addPage([600, 800]);
    page.drawText('PREFACE & COPYRIGHT', {
      x: 50,
      y: 720,
      size: 20,
      font: fontBold,
      color: rgb(0.2, 0.2, 0.2),
    });
    page.drawText('Published for secondary school education.', {
      x: 50,
      y: 680,
      size: 12,
      font: fontRegular,
    });
    page.drawText('All rights reserved. Unauthorized reproduction is strictly prohibited.', {
      x: 50,
      y: 650,
      size: 11,
      font: fontRegular,
      color: rgb(0.4, 0.4, 0.4),
    });
    page.drawText('This preliminary section contains introductory reading notes for teachers.', {
      x: 50,
      y: 620,
      size: 11,
      font: fontItalic,
      color: rgb(0.3, 0.3, 0.3),
    });
  }

  // Page 3: Table of Contents (TOC)
  {
    const page = pdfDoc.addPage([600, 800]);
    page.drawText('TABLE OF CONTENTS', {
      x: 50,
      y: 720,
      size: 22,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.3),
    });
    page.drawText('Unit 1: Introduction to Biology ................................. 4', {
      x: 50,
      y: 660,
      size: 12,
      font: fontRegular,
    });
    page.drawText('Unit 2: Cell Biology & Metabolism ............................. 8', {
      x: 50,
      y: 620,
      size: 12,
      font: fontRegular,
    });
    page.drawText('Unit 3: Genetics & Heredity ................................... 11', {
      x: 50,
      y: 580,
      size: 12,
      font: fontRegular,
    });
  }

  // Page 4: Unit 1 Start
  {
    const page = pdfDoc.addPage([600, 800]);
    page.drawText('UNIT 1: INTRODUCTION TO BIOLOGY', {
      x: 50,
      y: 720,
      size: 22,
      font: fontBold,
      color: rgb(0.1, 0.2, 0.6),
    });
    page.drawText('1.1 The Nature of Biological Science', {
      x: 50,
      y: 680,
      size: 15,
      font: fontBold,
    });
    page.drawText('Biology is the scientific study of life and living organisms.', {
      x: 50,
      y: 640,
      size: 11,
      font: fontRegular,
    });
    // Include a distractor sentence to test false-positive filtering!
    page.drawText('In Unit 2 we learned that cells reproduce, but here we begin with foundations.', {
      x: 50,
      y: 610,
      size: 11,
      font: fontItalic,
      color: rgb(0.3, 0.3, 0.3),
    });
  }

  // Page 5: Unit 1 Continued
  {
    const page = pdfDoc.addPage([600, 800]);
    page.drawText('1.2 Scientific Method & Hypothesis Testing', {
      x: 50,
      y: 720,
      size: 16,
      font: fontBold,
    });
    page.drawText('Scientists follow systematic observational steps to validate hypotheses.', {
      x: 50,
      y: 680,
      size: 11,
      font: fontRegular,
    });
  }

  // Page 6: Unit 1 Continued
  {
    const page = pdfDoc.addPage([600, 800]);
    page.drawText('1.3 Characteristics of Living Organisms', {
      x: 50,
      y: 720,
      size: 16,
      font: fontBold,
    });
    page.drawText('Metabolism, homeostasis, reproduction, and adaptation characterize life.', {
      x: 50,
      y: 680,
      size: 11,
      font: fontRegular,
    });
  }

  // Page 7: Unit 1 Review
  {
    const page = pdfDoc.addPage([600, 800]);
    page.drawText('Unit 1 Review Questions & Exercises', {
      x: 50,
      y: 720,
      size: 16,
      font: fontBold,
    });
    page.drawText('Complete questions 1 through 10 before moving to the next chapter.', {
      x: 50,
      y: 680,
      size: 11,
      font: fontRegular,
    });
  }

  // Page 8: Unit 2 Start
  {
    const page = pdfDoc.addPage([600, 800]);
    page.drawText('UNIT 2: CELL BIOLOGY', {
      x: 50,
      y: 720,
      size: 22,
      font: fontBold,
      color: rgb(0.1, 0.2, 0.6),
    });
    page.drawText('2.1 Structure and Function of the Cell', {
      x: 50,
      y: 680,
      size: 15,
      font: fontBold,
    });
    page.drawText('The cell is the basic structural and functional unit of all living forms.', {
      x: 50,
      y: 640,
      size: 11,
      font: fontRegular,
    });
  }

  // Page 9: Unit 2 Continued
  {
    const page = pdfDoc.addPage([600, 800]);
    page.drawText('2.2 Cell Membrane and Transport Mechanisms', {
      x: 50,
      y: 720,
      size: 16,
      font: fontBold,
    });
    page.drawText('Diffusion and active transport regulate solute concentration within cytoplasm.', {
      x: 50,
      y: 680,
      size: 11,
      font: fontRegular,
    });
  }

  // Page 10: Unit 2 Continued
  {
    const page = pdfDoc.addPage([600, 800]);
    page.drawText('2.3 Cellular Respiration & ATP Synthesis', {
      x: 50,
      y: 720,
      size: 16,
      font: fontBold,
    });
    page.drawText('Glycolysis and oxidative phosphorylation generate biochemical energy.', {
      x: 50,
      y: 680,
      size: 11,
      font: fontRegular,
    });
  }

  // Page 11: Unit 3 Start
  {
    const page = pdfDoc.addPage([600, 800]);
    page.drawText('UNIT 3: GENETICS', {
      x: 50,
      y: 720,
      size: 22,
      font: fontBold,
      color: rgb(0.1, 0.2, 0.6),
    });
    page.drawText('3.1 Mendelian Inheritance and Chromosomes', {
      x: 50,
      y: 680,
      size: 15,
      font: fontBold,
    });
    page.drawText('Traits pass from parents to offspring according to dominant and recessive alleles.', {
      x: 50,
      y: 640,
      size: 11,
      font: fontRegular,
    });
  }

  // Page 12: Unit 3 Continued
  {
    const page = pdfDoc.addPage([600, 800]);
    page.drawText('3.2 Molecular Structure of DNA', {
      x: 50,
      y: 720,
      size: 16,
      font: fontBold,
    });
    page.drawText('Deoxyribonucleic acid is composed of adenine, thymine, cytosine, and guanine.', {
      x: 50,
      y: 680,
      size: 11,
      font: fontRegular,
    });
  }

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' });
  return new File([blob], 'Biology Grade 10.pdf', { type: 'application/pdf' });
}
