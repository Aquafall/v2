<script lang="ts">
    import { WindowStore } from "../../ts/stores/windows";
</script>

<main>
    <div class="apprenderer" id="apprenderer">
        {#each WindowStore.windows as window }
            <div> {window.name} </div>
        {/each}
    </div>
</main>

<style>

</style>