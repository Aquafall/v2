import { H2OKernel } from "./ts/kernel/h2o"

async function Main() {
  console.log(`Welcome to Aquafall.
Starting up. Have fun!`)

    let kernel: H2OKernel = new H2OKernel()

    kernel.start()
}

Main() // we gotta start