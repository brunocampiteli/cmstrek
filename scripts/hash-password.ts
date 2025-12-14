import bcrypt from "bcrypt";

async function main() {
  const plain = "Qwetzp2709";
  const hash = await bcrypt.hash(plain, 10);
  console.log("Hash:", hash);
}

main().catch(console.error);