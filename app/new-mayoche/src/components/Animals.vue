<script setup lang="ts">
// defineProps<{
//   msg: string
// }>()
  import { ref } from 'vue';

  const listItems = ref([]);

  async function getData() {
    const res = await fetch("https://new.mayoche.info/data/animals.json");
    const finalRes = await res.json();
    listItems.value = finalRes;
  }

  getData()
</script>


<template>
  <div style="display: flex;flex-direction: row;">
    <figure v-for="item in listItems" :key="item.name">
    <div style="flex: 33.33%;padding: auto;">
      <img v-bind:src="item.image_url" v-bind:alt="item.name" height="400" width="400" alt="auto"/>
      <figcaption>{{ item.name }} of the day</figcaption>
      <figcaption>Last update {{ item.year }} {{ item.month }} {{ item.day }}</figcaption>
    </div>
  </figure>
  </div>
  <div class="results">
    <table>
      <thead>
        <tr>
          <th>Nom</th>
          <th>Animal</th>
          <th>Description</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>jay</td>
          <td>chat</td>
          <td>il est beau</td>

        </tr>
      </tbody>
    </table>
  </div>
</template>
<style scoped>
h1 {
  font-weight: 500;
  font-size: 2.6rem;
  top: -10px;
}

h3 {
  font-size: 1.2rem;
}

table {
  width: 40%;
  border: 1px solid green;
  text-align: center;
}

td {
  width: 40%;
  border: 1px solid green;
  text-align: center;
}

th {
  width: 40%;
  border: 1px solid green;
  text-align: center;
}

thead {
  width: 40%;
  border: 1px solid green;
  text-align: center;
}

tr {
  width: 40%;
  border: 1px solid green;
  text-align: center;
}

th {
  background-color: 'green';
  color: 'black';
}

</style>


<!-- const styles = {
  container: { width: 400, margin: '0 auto', display: 'flex', flex: 1, flexDirection: 'column', justifyContent: 'center', padding: 20 },
  choice: { marginBottom: 15 },
  input: { border: 'none', backgroundColor: '#ddd', marginBottom: 10, padding: 8, fontSize: 18 },
  choiceName: { fontSize: 20, fontWeight: 'bold' },
  choiceDescription: { marginBottom: 0 },
  button: { backgroundColor: 'black', color: 'white', outline: 'none', fontSize: 18, padding: '12px 0px' },
  table_td_th: { width: '40%', border: '1px solid green', textalign: 'center' },
  th: { backgroundcolor: 'green', color: 'black' },
  image_cat: { float: 'left', width: "100", height: "50" },
  image_dog: { float: 'rigth', width: "100", height: "50" }
} -->


