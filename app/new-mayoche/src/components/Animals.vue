<script setup lang="ts">
// defineProps<{
//   msg: string
// }>()
  import { ref } from 'vue';


  const listAnimals = ref([]);

  async function getDataAnimals() {
    const resAnimals = await fetch("https://new.mayoche.info/data/animals.json");
    const finalResAnimals = await resAnimals.json();
    listAnimals.value = finalResAnimals;
  }
  getDataAnimals()


  const listChoices = ref(null);
  async function getDataChoices() {

    const resChoices = await fetch("https://new-api.mayoche.info/choice/all");
    const finalResChoices = await resChoices.json();
    listChoices.value = finalResChoices.Items;
  }
  getDataChoices()
  
</script>


<template>
  <div style="display: flex;flex-direction: row;justify-content: center;">
    <figure v-for="item in listAnimals" :key="item.name">
    <div style=";padding: 25px">
      <img v-bind:src="item.image_url" v-bind:alt="item.name" height="400" width="400"/>
      <figcaption>{{ item.name }} of the day</figcaption>
      <figcaption>Last update {{ item.year }} {{ item.month }} {{ item.day }}</figcaption>
    </div>
  </figure>
  </div>
  <div style="width: 400px;margin: 0px auto;display: flex;flex: 1 1 0%;flex-direction: column;justify-content: center;padding: 20px;">
    <h2>Liste des 10 derniers choix</h2>
    <table>
      <thead>
        <tr>
          <th>Nom</th>
          <th>Animal</th>
          <th>Description</th>
          <th>CreatedAt</th>
          <th>Url</th>
        </tr>
      </thead>
      <tbody>
        
        <tr v-for="item in listChoices" :key="item.Items">
          <td>{{ item.Name.S }}</td>
          <td>{{ item.Animal.S }}</td>
          <td>{{ item.Description.S }}</td>
          <td>{{ item.CreatedAt.S.split('/')[0] }} {{ item.CreatedAt.S.split('/')[1] }} {{ item.CreatedAt.S.split('/')[2].split(':')[0] }}</td>
          <td><a v-bind:href="item.ImageUrl.S">Url image</a></td>
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


