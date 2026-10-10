const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log(" Memulai proses seeding database Subur.in...");

  console.log(" Membersihkan data tanaman lama (jika ada)...");
  await prisma.rawSensorLog.deleteMany({});
  await prisma.device.deleteMany({});
  await prisma.plant.deleteMany({});

  console.log(" Memasukkan data tanaman default...");
  const plants = [
    {
      name: "Bayam",
      scientificName: "Amaranthus spp.",
      description:
        "Sayuran hijau kaya zat besi dan vitamin. Bayam sayur lokal (Amaranthus); toleran kekeringan sedang namun rentan busuk akar saat media terlalu basah.",
      minPh: 6.0,
      maxPh: 7.0,
      phTarget: 6.5,
    },
    {
      name: "Pakcoy",
      scientificName: "Brassica rapa subsp. chinensis",
      description:
        "Sayuran daun populer dengan sistem perakaran dangkal yang menyukai media lembab tapi berdrainase baik.",
      minPh: 6.0,
      maxPh: 7.5,
      phTarget: 6.8,
    },
    {
      name: "Selada",
      scientificName: "Lactuca sativa",
      description:
        "Sayuran daun yang sangat sensitif terhadap cekaman kekeringan. Memerlukan kelembapan media terjaga di atas trigger NMI.",
      minPh: 6.0,
      maxPh: 6.7,
      phTarget: 6.5,
    },
  ];

  for (const plant of plants) {
    const createdPlant = await prisma.plant.create({
      data: plant,
    });
    console.log(` Berhasil membuat tanaman: ${createdPlant.name}`);
  }

  console.log(" Proses seeding database selesai dengan sukses!");
}

main()
  .catch((e) => {
    console.error(" Terjadi error saat seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
