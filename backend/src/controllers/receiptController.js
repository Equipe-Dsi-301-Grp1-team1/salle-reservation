const receiptService = require('../services/receiptService');

async function download(req, res) {
  try {
    const pdf = await receiptService.buildReceipt(req.user.id, req.params.id);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="recu-' + req.params.id + '.pdf"');
    res.send(pdf);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
}

module.exports = { download };
